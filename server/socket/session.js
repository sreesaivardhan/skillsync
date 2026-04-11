// Socket.io handler for managing active skill-exchange session events

import Session from '../models/Session.js';
import User from '../models/User.js';
import SkillDebt from '../models/SkillDebt.js';
import { onlineUsers } from './presence.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
        const sessionDoc = await Session.create({
          roomId,
          userA: userAId,
          userB: userBId,
          status: 'active',
          startedAt: new Date(),
        });

        io.to(roomId).emit('room:ready', {
          roomId,
          sessionId: sessionDoc._id,
          users: [
            { userId: userAId, username: userAUsername },
            { userId: userBId, username: userBUsername },
          ],
        });

        // ── AI Session Agenda Generation ────────────────────────────────────
        // AI temporarily disabled - quota issue
        const matchExplanation = null;
      } catch (err) {
        console.error('room:join error:', err.message);
      }
    });

    // ── chat:message ────────────────────────────────────────────────────────────
    // Payload: { roomId, message, senderId, senderName, imageData?, fileUrl?, fileName? }
    socket.on('chat:message', async (data) => {
      const { roomId, message, senderId, senderName } = data;
      const timestamp = new Date();

      try {
        // Persist message to MongoDB (text only — binary data not stored in DB)
        await Session.findOneAndUpdate(
          { roomId },
          {
            $push: {
              messages: { senderId, text: message || '[attachment]', timestamp },
            },
          }
        );
      } catch (err) {
        console.error('chat:message DB error:', err.message);
      }

      // Broadcast ALL fields to everyone in the room EXCEPT the sender
      socket.to(roomId).emit('chat:broadcast', {
        message:   data.message   || '',
        senderName: data.senderName,
        senderId:  data.senderId,
        imageData: data.imageData || null,
        fileUrl:   data.fileUrl   || null,
        fileName:  data.fileName  || null,
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

        // Hoist socket lookups here — used in both debt:update and credit:update below
        const socketA = findSocketIdByUserId(userAId);
        const socketB = findSocketIdByUserId(userBId);

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

        // ── Create bidirectional SkillDebt entries ───────────────────────────────
        // Re-fetch session with populated user skill data
        const populatedSession = await Session.findOne({ roomId })
          .populate('userA', 'skillsOffered username')
          .populate('userB', 'skillsOffered username');

        if (populatedSession?.userA && populatedSession?.userB) {
          const uA = populatedSession.userA;
          const uB = populatedSession.userB;

          // Safely extract the first offered skill name from each user
          const skillTaughtByA = uA.skillsOffered?.[0]?.skill ?? 'Unknown Skill';
          const skillTaughtByB = uB.skillsOffered?.[0]?.skill ?? 'Unknown Skill';

          // Both users taught each other — create two debt records
          await SkillDebt.insertMany([
            {
              debtor:      uA._id,   // A received skill from B
              creditor:    uB._id,
              skillTaught: skillTaughtByB,
              sessionId:   populatedSession._id,
              status:      'pending',
            },
            {
              debtor:      uB._id,   // B received skill from A
              creditor:    uA._id,
              skillTaught: skillTaughtByA,
              sessionId:   populatedSession._id,
              status:      'pending',
            },
          ]);

          // ── Emit debt:update to each user with their full pending debt list ────
          const [debtsA, debtsB] = await Promise.all([
            SkillDebt.find({ debtor: uA._id, status: 'pending' })
              .populate('creditor', 'username'),
            SkillDebt.find({ debtor: uB._id, status: 'pending' })
              .populate('creditor', 'username'),
          ]);

          if (socketA) io.to(socketA).emit('debt:update', { debts: debtsA });
          if (socketB) io.to(socketB).emit('debt:update', { debts: debtsB });
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
        // (socketA and socketB already looked up above)

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
