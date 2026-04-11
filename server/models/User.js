// Mongoose model for a SkillSync user (name, email, password, skills, credits, etc.)

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    skillsOffered: [
      {
        skill: { type: String },
        level: {
          type: String,
          enum: ['Beginner', 'Intermediate', 'Expert'],
        },
      },
    ],
    skillsWanted: [{ type: String }],
    credits: {
      type: Number,
      default: 10,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    socketId: {
      type: String,
      default: null,
    },
    reputationScore: {
      type: Number,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
