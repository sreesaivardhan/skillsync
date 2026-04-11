// REST route for SkillSync platform analytics and user stats

import { Router } from 'express';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// ── GET /api/analytics/community-skills ───────────────────────────────────────
// Aggregates all users' skillsOffered to find the most popular skills on the platform
router.get('/community-skills', async (req, res) => {
  try {
    const aggregation = await User.aggregate([
      // Unwind the skillsOffered array so each skill becomes its own document
      { $unwind: '$skillsOffered' },
      // Group by the skill string and count occurrences
      {
        $group: {
          _id: '$skillsOffered.skill',
          count: { $sum: 1 },
        },
      },
      // Sort by count descending
      { $sort: { count: -1 } },
      // Limit to top 8 most popular
      { $limit: 8 },
    ]);

    // Map _id back to skill for clearer client consumption
    const skills = aggregation.map((item) => ({
      skill: item._id,
      count: item.count,
    }));

    res.json({ skills });
  } catch (err) {
    console.error('GET /analytics/community-skills error:', err.message);
    res.status(500).json({ message: 'Server error fetching community skills' });
  }
});

// ── GET /api/analytics/my-profile ──────────────────────────────────────────────
// Fetch exact stat block for the current user's profile dashboard
router.get('/my-profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      skillsOffered:   user.skillsOffered,
      skillsWanted:    user.skillsWanted,
      reputationScore: user.reputationScore,
      totalSessions:   user.totalSessions,
      ratingCount:     user.ratingCount,
    });
  } catch (err) {
    console.error('GET /analytics/my-profile error:', err.message);
    res.status(500).json({ message: 'Server error fetching profile stats' });
  }
});

export default router;
