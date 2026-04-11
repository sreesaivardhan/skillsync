// REST route for submitting post-session peer ratings

import { Router } from 'express';
import Session from '../models/Session.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

// ── POST /api/rating/submit ───────────────────────────────────────────────────
// Body: { sessionId, ratedUserId, stars, endorsement }
router.post('/submit', async (req, res) => {
  // ── Debug: log exactly what was received ────────────────────────────────────
  console.log('Rating submit body:', req.body);
  console.log('Rating submit user:', req.user?.id);

  const { sessionId, ratedUserId, stars, endorsement = '' } = req.body;
  const raterId = req.user.id;

  // ── 0. Explicit field presence checks ──────────────────────────────────────
  if (!sessionId || !ratedUserId || stars == null) {
    console.error('Rating missing fields:', { sessionId, ratedUserId, stars, userId: req.user?.id });
    return res.status(400).json({
      message: 'Missing required fields',
      received: { sessionId, ratedUserId, stars },
    });
  }

  // ── 1. Validate stars ───────────────────────────────────────────────────────
  const starsNum = Number(stars);
  if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
    return res.status(400).json({ message: 'stars must be an integer between 1 and 5' });
  }

  // ── 2. Can't rate yourself ──────────────────────────────────────────────────
  if (String(raterId) === String(ratedUserId)) {
    return res.status(400).json({ message: 'You cannot rate yourself' });
  }


  try {
    // ── 3. Fetch session ────────────────────────────────────────────────────────
    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // ── 4. Verify caller is a participant ───────────────────────────────────────
    const userAId = String(session.userA);
    const userBId = String(session.userB);
    const callerIsParticipant =
      String(raterId) === userAId || String(raterId) === userBId;

    if (!callerIsParticipant) {
      return res.status(403).json({ message: 'You were not part of this session' });
    }

    // (Session status check removed to prevent socket/DB race conditions)

    // ── 6. Prevent duplicate rating (same rater → same ratedUser in this session) ─
    const alreadyRated = session.ratings.some(
      (r) =>
        String(r.rater) === String(raterId) &&
        String(r.ratedUser) === String(ratedUserId)
    );

    if (alreadyRated) {
      return res.status(409).json({ message: 'You have already rated this user for this session' });
    }

    // ── 7. Push rating into session document ────────────────────────────────────
    session.ratings.push({
      rater:       raterId,
      ratedUser:   ratedUserId,
      stars:       starsNum,
      endorsement,
    });
    await session.save();

    // ── 8. Recalculate reputationScore as running average ───────────────────────
    // Formula: newAvg = (oldAvg * oldCount + newStars) / (oldCount + 1)
    const ratedUser = await User.findById(ratedUserId);

    if (!ratedUser) {
      return res.status(404).json({ message: 'Rated user not found' });
    }

    const oldCount  = ratedUser.ratingCount ?? 0;
    const oldAvg    = ratedUser.reputationScore ?? 0;
    const newCount  = oldCount + 1;
    const newAvg    = parseFloat(((oldAvg * oldCount + starsNum) / newCount).toFixed(2));

    ratedUser.reputationScore = newAvg;
    ratedUser.ratingCount     = newCount;
    await ratedUser.save();

    return res.json({
      success: true,
      newScore: newAvg,
      ratingCount: newCount,
    });
  } catch (err) {
    console.error('POST /rating/submit error:', err.message);
    res.status(500).json({ message: 'Server error submitting rating' });
  }
});

export default router;
