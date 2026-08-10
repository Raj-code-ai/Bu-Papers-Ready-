const mongoose = require('mongoose');

const backupRecordSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'manual'],
      required: true,
      index: true,
    },
    path: { type: String, required: true },
    sizeBytes: { type: Number, default: 0 },
    checksum: { type: String, default: '' },
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'running', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

backupRecordSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BackupRecord', backupRecordSchema);
