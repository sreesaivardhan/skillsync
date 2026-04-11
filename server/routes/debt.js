// REST routes for querying and repaying SkillDebt records

import { Router } from 'express';
import SkillDebt from '../models/SkillDebt.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// All routes require a valid JWT
router.use(authMiddleware);

// ── GET /api/debts/my ─────────────────────────────────────────────────────────
// Returns all pending debts where the current user is the debtor
router.get('/my', async (req, res) => {
  try {
    const debts = await SkillDebt.find({
      debtor: req.user.id,
      status:  'pending',
    })
      .populate('creditor', 'username')
      .populate('sessionId', 'completedAt');

    res.json({ debts });
  } catch (err) {
    console.error('GET /debts/my error:', err.message);
    res.status(500).json({ message: 'Server error fetching debts' });
  }
});

// ── GET /api/debts/owed-to-me ────────────────────────────────────────────────
// Returns all pending debts where the current user is the creditor
router.get('/owed-to-me', async (req, res) => {
  try {
    const debts = await SkillDebt.find({
      creditor: req.user.id,
      status:   'pending',
    }).populate('debtor', 'username');

    res.json({ debts });
  } catch (err) {
    console.error('GET /debts/owed-to-me error:', err.message);
    res.status(500).json({ message: 'Server error fetching debts owed to you' });
  }
});

// ── PATCH /api/debts/:debtId/repay ───────────────────────────────────────────
// Marks a debt as repaid — only the debtor may do this
router.patch('/:debtId/repay', async (req, res) => {
  try {
    const debt = await SkillDebt.findById(req.params.debtId);

    if (!debt) {
      return res.status(404).json({ message: 'Debt not found' });
    }

    // Only the debtor can mark their own debt repaid
    if (String(debt.debtor) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Not authorised to repay this debt' });
    }

    if (debt.status === 'repaid') {
      return res.status(400).json({ message: 'Debt is already repaid' });
    }

    debt.status = 'repaid';
    await debt.save();

    res.json({ message: 'Debt marked as repaid', debt });
  } catch (err) {
    console.error('PATCH /debts/:debtId/repay error:', err.message);
    res.status(500).json({ message: 'Server error repaying debt' });
  }
});

export default router;
