const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      default: 'System is under maintenance. Please try again later.',
    },
    maintenanceBlockPublic: { type: Boolean, default: true },
    backupEnabled: { type: Boolean, default: true },
    backupCronDaily: { type: String, default: '0 2 * * *' },
    backupCronWeekly: { type: String, default: '0 3 * * 0' },
    backupCronMonthly: { type: String, default: '0 4 1 * *' },
    backupRetentionDays: { type: Number, default: 90, min: 1 },
    appName: { type: String, default: 'Academic Resource Management System' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
