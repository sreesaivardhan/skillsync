// Mongoose model tracking skill-debt/credit balances between users

import mongoose from 'mongoose';

const SkillDebtSchema = new mongoose.Schema(
  {
    debtor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    creditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skillTaught: {
      type: String,
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
    },
    status: {
      type: String,
      enum: ['pending', 'repaid'],
      default: 'pending',
    },
    nudgeSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('SkillDebt', SkillDebtSchema);
