// Socket.io handler for tracking user online/offline presence in the lobby

import User from '../models/User.js';

export const initPresence = (io) => {
  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth?.userId;

    // ── User comes online ─────────────────────────────────────────────────────
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          socketId: socket.id,
        });

        // Broadcast updated online-user list to everyone in lobby
        const onlineUsers = await User.find({ isOnline: true }).select(
          '-password'
        );
        io.emit('lobby:users', onlineUsers);
      } catch (err) {
        console.error('Presence connect error:', err.message);
      }
    }

    // ── User goes offline ─────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      if (!userId) return;
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          socketId: null,
        });

        const onlineUsers = await User.find({ isOnline: true }).select(
          '-password'
        );
        io.emit('lobby:users', onlineUsers);
      } catch (err) {
        console.error('Presence disconnect error:', err.message);
      }
    });
  });
};
