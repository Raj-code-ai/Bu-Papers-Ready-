const mongoose = require('mongoose');

const securityPolicySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    minPasswordLength: { type: Number, default: 10, min: 8 },
    requireUppercase: { type: Boolean, default: true },
    requireLowercase: { type: Boolean, default: true },
    requireNumber: { type: Boolean, default: true },
    requireSpecial: { type: Boolean, default: true },
    sessionTimeoutMinutes: { type: Number, default: 60, min: 5 },
    accountLockMaxAttempts: { type: Number, default: 5, min: 3 },
    accountLockDurationMinutes: { type: Number, default: 30, min: 1 },
    passwordResetTokenExpiresMinutes: { type: Number, default: 30, min: 5 },
    superAdmin2faRequired: { type: Boolean, default: true },
    allowConcurrentSessions: { type: Boolean, default: true },
    maxConcurrentSessions: { type: Number, default: 10, min: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('SecurityPolicy', securityPolicySchema);
