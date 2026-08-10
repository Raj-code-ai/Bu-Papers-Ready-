const mongoose = require('mongoose');

const emailSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    enabled: { type: Boolean, default: false },
    provider: { type: String, default: 'smtp' },
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '', select: false },
    emailFrom: { type: String, default: 'ARMS <noreply@example.com>' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('EmailSettings', emailSettingsSchema);
