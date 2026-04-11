// Socket.io handler for skill-based user matching logic in real time

import { onlineUsers } from './presence.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── In-memory store: Set of socketIds currently searching for a match ─────────
const searchingUsers = new Set();

// ── Helper: check if two string arrays share at least one value ───────────────
const hasIntersection = (arrA = [], arrB = []) => {
  const setA = new Set(arrA.map((s) => s.toLowerCase().trim()));
  return arrB.some((s) => setA.has(s.toLowerCase().trim()));
};

// ── Helper: get the socketId for a given userId from onlineUsers Map ──────────
const findSocketIdByUserId = (userId) => {
  for (const [socketId, data] of onlineUsers.entries()) {
    if (data.userId === userId) return socketId;
  }
  return null;
};

export const initMatching = (io) => {
  io.on('connection', (socket) => {

    // ── match:request ───────────────────────────────────────────────────────────
    // Payload: { userId }
    socket.on('match:request', async ({ userId }) => {
      searchingUsers.add(socket.id);
      socket.emit('match:searching', { status: 'searching' });

      const requester = onlineUsers.get(socket.id);
      if (!requester) return;

      let matchFound = false;

      // ── Matching algorithm ────────────────────────────────────────────────────
      for (const [candidateSocketId, candidate] of onlineUsers.entries()) {
        // Skip self
        if (candidateSocketId === socket.id) continue;

        // Skip users not available or not searching
        if (candidate.status !== 'available') continue;
        if (!searchingUsers.has(candidateSocketId)) continue;

        // Extract skill names from skillsOffered (array of { skill, level })
        const requesterOfferedSkills = (requester.skillsOffered || []).map(
          (s) => s.skill
        );
        const candidateOfferedSkills = (candidate.skillsOffered || []).map(
          (s) => s.skill
        );

        const requesterWantsCanTeach = hasIntersection(
          requester.skillsWanted,
          candidateOfferedSkills
        );
        const candidateWantsCanTeach = hasIntersection(
          candidate.skillsWanted,
          requesterOfferedSkills
        );

        if (requesterWantsCanTeach && candidateWantsCanTeach) {
          matchFound = true;

          // ── Generate unique roomId ──────────────────────────────────────────
          const roomId = `${requester.userId}_${candidate.userId}_${Date.now()}`;

          // ── Remove both from searching pool ────────────────────────────────
          searchingUsers.delete(socket.id);
          searchingUsers.delete(candidateSocketId);

          // ── Mark both as in-session in onlineUsers Map ─────────────────────
          onlineUsers.set(socket.id, { ...requester, status: 'in-session' });
          onlineUsers.set(candidateSocketId, { ...candidate, status: 'in-session' });

          // ── AI Match Explanation ───────────────────────────────────────────
          // AI temporarily disabled - quota issue
          let matchExplanation = null;

          // ── Notify requester ───────────────────────────────────────────────
          socket.emit('match:found', {
            roomId,
            matchExplanation,
            matchedUser: {
              username: candidate.username,
              skillsOffered: candidate.skillsOffered,
              skillsWanted: candidate.skillsWanted,
            },
          });

          // ── Notify candidate ───────────────────────────────────────────────
          io.to(candidateSocketId).emit('match:found', {
            roomId,
            matchExplanation,
            matchedUser: {
              username: requester.username,
              skillsOffered: requester.skillsOffered,
              skillsWanted: requester.skillsWanted,
            },
          });

          // ── Broadcast updated lobby ────────────────────────────────────────
          io.emit('lobby:update', Array.from(onlineUsers.values()));

          break;
        }
      }

      // ── No match found — set 30s timeout ─────────────────────────────────────
      if (!matchFound) {
        const timeoutId = setTimeout(() => {
          if (searchingUsers.has(socket.id)) {
            searchingUsers.delete(socket.id);
            socket.emit('match:timeout');
          }
        }, 30_000);

        // Clear timeout if socket disconnects before it fires
        socket.once('disconnect', () => clearTimeout(timeoutId));
      }
    });

    // ── match:accept ────────────────────────────────────────────────────────────
    // Payload: { roomId, userId }
    // Room join is handled in session.js — log acceptance only
    socket.on('match:accept', ({ roomId, userId }) => {
      console.log(`User ${userId} accepted match for room ${roomId}`);
    });

    // ── match:declined ──────────────────────────────────────────────────────────
    // Payload: { roomId, userId }  (userId = the one who clicked Decline)
    socket.on('match:declined', ({ roomId, userId }) => {
      console.log(`[match:declined] decliner=${userId}, roomId=${roomId}`);
      let otherUserId = null;

      // roomId format: "<userAId>_<userBId>_<timestamp>"
      // Split to get the two participant IDs reliably
      const [partA, partB] = roomId.split('_');

      for (const [socketId, user] of onlineUsers.entries()) {
        const uid = String(user.userId);
        if (uid === String(partA) || uid === String(partB)) {
          console.log(`[match:declined] resetting user ${uid} → available`);
          onlineUsers.set(socketId, { ...user, status: 'available' });
          searchingUsers.delete(socketId);
          if (uid !== String(userId)) {
            otherUserId = uid;
          }
        }
      }

      console.log(`[match:declined] otherUserId to notify: ${otherUserId}`);

      // Notify the accepted user so their UI can reset even if they navigated
      if (otherUserId) {
        const otherSocketId = findSocketIdByUserId(otherUserId);
        console.log(`[match:declined] otherSocketId: ${otherSocketId}`);
        if (otherSocketId) {
          io.to(otherSocketId).emit('match:declined', {
            message: 'Your match partner declined.',
          });
        }
      }

      io.emit('lobby:update', Array.from(onlineUsers.values()));
    });
  });
};
