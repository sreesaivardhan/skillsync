import 'dotenv/config';
// Entry point for the SkillSync Express + Socket.io server

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import debtRoutes from './routes/debt.js';
import ratingRoutes from './routes/rating.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/userRoutes.js';
import { initPresence } from './socket/presence.js';
import { initMatching } from './socket/matching.js';
import { initSession } from './socket/session.js';

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();

app.use(
  cors({
    origin: ['https://skillsync-nine-mauve.vercel.app', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/debts',     debtRoutes);
app.use('/api/rating',    ratingRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'SkillSync server running' });
});

// ── HTTP + Socket.io server ───────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['https://skillsync-nine-mauve.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ── Socket handlers ───────────────────────────────────────────────────────────
initPresence(io);
initMatching(io);
initSession(io);

// ── Start listening ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`SkillSync server running on port ${PORT}`);
});
