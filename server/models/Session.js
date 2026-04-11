// Mongoose model for a skill-exchange session between two matched users

import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillFocus: {
      type: String,
    },
    status: {
      type: String,
      enum: ['waiting', 'active', 'completed', 'cancelled'],
      default: 'waiting',
    },
    messages: [
      {
        senderId: { type: mongoose.Schema.Types.ObjectId },
        text: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    sharedNotes: {
      type: String,
      default: '',
    },
    completedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    creditTransferred: {
      type: Boolean,
      default: false,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    // Tracks who has submitted a rating for this session (prevents duplicates)
    ratings: [
      {
        rater:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        ratedUser:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        stars:       { type: Number, min: 1, max: 5 },
        endorsement: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Session', SessionSchema);
