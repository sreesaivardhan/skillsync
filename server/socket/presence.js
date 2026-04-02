// Socket.io handler for tracking user online/offline presence in the lobby

import User from '../models/User.js';

// ── In-memory store: socketId → { userId, username, skillsOffered, skillsWanted, credits, status }
export const onlineUsers = new Map();

// ── Helper: convert Map to a plain array for emitting ─────────────────────────
const getLobbyArray = () => Array.from(onlineUsers.values());

export const initPresence = (io) => {
  io.on('connection', (socket) => {

    // ── user:register ───────────────────────────────────────────────────────────
    // Payload: { userId, username, skillsOffered, skillsWanted, credits }
    socket.on('user:register', async ({ userId, username, skillsOffered, skillsWanted, credits }) => {
      try {
        // Add to in-memory Map
        onlineUsers.set(socket.id, {
          userId,
          username,
          skillsOffered,
          skillsWanted,
          credits,
          status: 'available',
        });

        // Persist online state to MongoDB
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          socketId: socket.id,
        });

        // Broadcast updated lobby to ALL clients
        io.emit('lobby:update', getLobbyArray());
      } catch (err) {
        console.error('user:register error:', err.message);
      }
    });

    // ── disconnect ──────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const user = onlineUsers.get(socket.id);
      if (!user) return;

      const { userId } = user;

      // Remove from in-memory Map
      onlineUsers.delete(socket.id);

      try {
        // Persist offline state to MongoDB
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          socketId: null,
        });
      } catch (err) {
        console.error('disconnect DB update error:', err.message);
      }

      // Broadcast updated lobby
      io.emit('lobby:update', getLobbyArray());

      // Notify all clients this user went offline
      io.emit('user:offline', { userId });
    });
  });
};
