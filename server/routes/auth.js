// Express router for authentication routes: /register, /login, and /google OAuth

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';

import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import transporter from '../config/mailer.js';

const router = express.Router();

// ── Helper: sign a JWT ────────────────────────────────────────────────────────
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, skillsOffered, skillsWanted } = req.body;

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        skillsOffered: skillsOffered || [],
        skillsWanted: skillsWanted || [],
      });

      const token = signToken(newUser._id);

      return res.status(201).json({
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          credits: newUser.credits,
          skillsOffered: newUser.skillsOffered,
          skillsWanted: newUser.skillsWanted,
        },
      });
    } catch (error) {
      console.error('Register error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const newUser = await User.findOne({ email });
      if (!newUser) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, newUser.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = signToken(newUser._id);

      return res.json({
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          credits: newUser.credits,
          skillsOffered: newUser.skillsOffered,
          skillsWanted: newUser.skillsWanted,
        },
      });
    } catch (error) {
      console.error('Login error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// ── PUT /api/auth/profile ──────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, skillsOffered, skillsWanted } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, skillsOffered, skillsWanted },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// ── PUT /api/auth/password ────────────────────────────────────────────────────
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });
    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating password' });
  }
});

// ── GET /api/auth/google — initiate Google OAuth ──────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// ── GET /api/auth/google/callback — Google redirects here after auth ───────────
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    // Redirect to frontend with token — AuthCallback.jsx picks it up
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// ── POST /api/auth/forgot-password ─────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with that email.' });

    // Google-only accounts have no password — send guidance email instead
    if (user.googleId && !user.password) {
      await transporter.sendMail({
        from: `"SkillSync" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'SkillSync — Your account uses Google Sign-In',
        html: `<p>Hi ${user.username},</p>
               <p>Your SkillSync account is linked to Google. Please use the <strong>Continue with Google</strong> button on the login page to sign in.</p>
               <p>No password reset is needed.</p>`,
      });
      return res.json({ message: 'This account uses Google Sign-In. We sent you an email with instructions.' });
    }

    // Normal account — generate a timed reset token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken   = token;
    user.resetPasswordExpires = Date.now() + 3_600_000; // 1 hour
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: `"SkillSync" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'SkillSync — Reset Your Password',
      html: `<p>Hi ${user.username},</p>
             <p>Click the link below to reset your password. This link expires in 1 hour.</p>
             <a href="${resetURL}" style="padding:10px 20px;background:#142d4c;color:#fff;border-radius:6px;text-decoration:none;">Reset Password</a>
             <p>If you didn't request this, ignore this email.</p>`,
    });

    res.json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    console.error('Forgot password error — full details:', err);
    res.status(500).json({ message: 'Failed to send email. Check server logs for SMTP error.' });
  }
});

// ── GET /api/auth/reset-password?token=xxx — validate token ──────────────────
router.get('/reset-password', async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    res.json({ valid: true, email: user.email });
  } catch (err) {
    console.error('Reset-password GET error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ── POST /api/auth/reset-password — save new password ───────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken:   token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    user.password             = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken   = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password updated successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset-password POST error:', err.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

export default router;
