// Socket.io handler for managing active skill-exchange session events

import Session from '../models/Session.js';
import User from '../models/User.js';
import SkillDebt from '../models/SkillDebt.js';
import { onlineUsers } from './presence.js';

// ── Helper: find socketId for a given userId in onlineUsers Map ───────────────
const findSocketIdByUserId = (userId) => {
  for (const [socketId, data] of onlineUsers.entries()) {
    if (String(data.userId) === String(userId)) return socketId;
  }
  return null;
};

// ── Helper: get all socketIds currently in a Socket.io room ───────────────────
const getRoomSockets = (io, roomId) => {
  return io.sockets.adapter.rooms.get(roomId) ?? new Set();
};

export const initSession = (io) => {
  io.on('connection', (socket) => {

    // ── room:join ───────────────────────────────────────────────────────────────
    // Payload: { roomId, userId }
    socket.on('room:join', async ({ roomId, userId }) => {
      socket.join(roomId);

      const roomSockets = getRoomSockets(io, roomId);

      // Only proceed when both users have joined
      if (roomSockets.size !== 2) return;

      try {
        // Derive userA and userB from the roomId (format: userA_userB_timestamp)
        const [userAId, userBId] = roomId.split('_');

        // Look up real usernames from the in-memory onlineUsers Map
        const userAData = [...onlineUsers.values()].find(u => String(u.userId) === String(userAId));
        const userBData = [...onlineUsers.values()].find(u => String(u.userId) === String(userBId));
        const userAUsername = userAData?.username ?? 'User A';
        const userBUsername = userBData?.username ?? 'User B';

        // Create the session document in MongoDB
        await Session.create({
          roomId,
          userA: userAId,
          userB: userBId,
          status: 'active',
          startedAt: new Date(),
        });

        io.to(roomId).emit('room:ready', {
          roomId,
          users: [
            { userId: userAId, username: userAUsername },
            { userId: userBId, username: userBUsername },
          ],
        });
      } catch (err) {
        console.error('room:join error:', err.message);
      }
    });

    // ── chat:message ────────────────────────────────────────────────────────────
    // Payload: { roomId, message, senderId, senderName }
    socket.on('chat:message', async ({ roomId, message, senderId, senderName }) => {
      const timestamp = new Date();

      try {
        // Persist message to MongoDB
        await Session.findOneAndUpdate(
          { roomId },
          {
            $push: {
              messages: { senderId, text: message, timestamp },
            },
          }
        );
      } catch (err) {
        console.error('chat:message DB error:', err.message);
      }

      // Broadcast to everyone in the room EXCEPT the sender
      socket.to(roomId).emit('chat:broadcast', {
        message,
        senderName,
        senderId,
        timestamp,
      });
    });

    // ── notes:update ────────────────────────────────────────────────────────────
    // Payload: { roomId, content }
    socket.on('notes:update', async ({ roomId, content }) => {
      try {
        // Last-write-wins — just overwrite sharedNotes
        await Session.findOneAndUpdate({ roomId }, { sharedNotes: content });
      } catch (err) {
        console.error('notes:update DB error:', err.message);
      }

      // Sync notes to everyone in the room EXCEPT the sender
      socket.to(roomId).emit('notes:sync', { content });
    });

    // ── session:complete ────────────────────────────────────────────────────────
    // Payload: { roomId, userId }
    socket.on('session:complete', async ({ roomId, userId }) => {
      try {
        // Add userId to completedBy if not already there
        const session = await Session.findOneAndUpdate(
          { roomId, completedBy: { $ne: userId } },
          { $push: { completedBy: userId } },
          { returnDocument: 'after' }
        );

        if (!session) return; // Already added or session not found

        // First user confirmed — notify the other user to also click Complete
        if (session.completedBy.length < 2) {
          socket.to(roomId).emit('session:partner_completed', {
            message: 'Your partner marked the session complete. Click Complete to finish!',
          });
          return;
        }

        // ── Both confirmed — finalise session ───────────────────────────────────
        await Session.findOneAndUpdate(
          { roomId },
          {
            status: 'completed',
            completedAt: new Date(),
            creditTransferred: true,
          }
        );

        const userAId = String(session.userA);
        const userBId = String(session.userB);

        // ── Award +1 credit to each participant ─────────────────────────────────
        const [updatedUserA, updatedUserB] = await Promise.all([
          User.findByIdAndUpdate(
            userAId,
            { $inc: { credits: 1, totalSessions: 1 } },
            { returnDocument: 'after' }
          ),
          User.findByIdAndUpdate(
            userBId,
            { $inc: { credits: 1, totalSessions: 1 } },
            { returnDocument: 'after' }
          ),
        ]);

        // ── Create SkillDebt if skillFocus is recorded ──────────────────────────
        if (session.skillFocus) {
          await SkillDebt.create({
            debtor: userBId,
            creditor: userAId,
            skillTaught: session.skillFocus,
            sessionId: session._id,
          });
        }

        // ── Reset both users to 'available' in onlineUsers Map ──────────────────
        for (const [socketId, user] of onlineUsers.entries()) {
          if (
            String(user.userId) === userAId ||
            String(user.userId) === userBId
          ) {
            onlineUsers.set(socketId, { ...user, status: 'available' });
          }
        }

        // ── Emit session:confirmed to the room ───────────────────────────────────
        io.to(roomId).emit('session:confirmed', {
          roomId,
          message: 'Session complete!',
        });

        // ── Emit credit:update to each user individually ────────────────────────
        const socketA = findSocketIdByUserId(userAId);
        const socketB = findSocketIdByUserId(userBId);

        if (socketA) {
          io.to(socketA).emit('credit:update', {
            userId: userAId,
            newBalance: updatedUserA.credits,
            delta: 1,
          });
        }

        if (socketB) {
          io.to(socketB).emit('credit:update', {
            userId: userBId,
            newBalance: updatedUserB.credits,
            delta: 1,
          });
        }

        // ── Broadcast updated lobby ──────────────────────────────────────────────
        io.emit('lobby:update', Array.from(onlineUsers.values()));
      } catch (err) {
        console.error('session:complete error:', err.message);
      }
    });

    // ── disconnect (mid-session guard) ──────────────────────────────────────────
    socket.on('disconnect', async () => {
      // Check every Socket.io room this socket was part of
      for (const roomId of socket.rooms) {
        // socket.rooms always contains socket.id itself — skip it
        if (roomId === socket.id) continue;

        // Check if there's an active session for this room
        try {
          const activeSession = await Session.findOne({
            roomId,
            status: 'active',
          });

          if (activeSession) {
            // Notify remaining partner
            socket.to(roomId).emit('room:partner_left', {
              message: 'Your partner disconnected.',
            });
          }
        } catch (err) {
          console.error('disconnect session check error:', err.message);
        }
      }
    });
  });
};
