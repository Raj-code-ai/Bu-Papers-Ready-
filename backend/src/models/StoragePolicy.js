const mongoose = require('mongoose');

const storagePolicySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    maxFileSizeMb: { type: Number, default: 25, min: 1 },
    adminQuotaMb: { type: Number, default: 2048, min: 1 },
    duplicateDetection: { type: Boolean, default: true },
    compression: { type: Boolean, default: false },
    recycleBinRetentionDays: { type: Number, default: 30, min: 1 },
    monthlyBudgetUsd: { type: Number, default: 50, min: 0 },
    warningPercent: { type: Number, default: 80, min: 1, max: 100 },
    criticalPercent: { type: Number, default: 95, min: 1, max: 100 },
    autoCleanup: { type: Boolean, default: true },
    cloudProvider: {
      type: String,
      enum: ['cloudinary', 's3', 'gcs'],
      default: 'cloudinary',
    },
    notificationRules: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        storageWarning: true,
        storageCritical: true,
        budgetAlert: true,
        largeUpload: true,
        duplicateUpload: true,
        cloudFailure: true,
      },
    },
    largeUploadThresholdMb: { type: Number, default: 15, min: 1 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('StoragePolicy', storagePolicySchema);
