import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// ── PATCH /api/users/:userId ──────────────────────────────────────────────────
router.patch('/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Accept strictly defined partial updates mapping to the core User model
    const { username, skillsOffered, skillsWanted } = req.body;
    
    const updatePayload = {};
    if (username !== undefined) updatePayload.username = username;
    if (skillsOffered !== undefined) updatePayload.skillsOffered = skillsOffered;
    if (skillsWanted !== undefined) updatePayload.skillsWanted = skillsWanted;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updatePayload },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// ── PATCH /api/users/:userId/password ──────────────────────────────────────────
router.patch('/:userId/password', authMiddleware, async (req, res) => {
  try {
    if (req.user.id !== req.params.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password too short' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error updating password' });
  }
});

export default router;
