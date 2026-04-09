// Express router for authentication routes: /register and /login

import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

import User from '../models/User.js';

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

export default router;
