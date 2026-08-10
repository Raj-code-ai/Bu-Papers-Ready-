const cron = require('node-cron');
const Paper = require('../models/Paper');
const User = require('../models/User');
const { getActiveStoragePolicy, deleteStoredFile } = require('../storage/storage.service');
const backupService = require('../services/backup.service');
const monitoringService = require('../monitoring/monitoring.service');
const env = require('../config/env');
const logger = require('../config/logger');

async function cleanupRecycleBin() {
  const policy = await getActiveStoragePolicy();
  if (!policy.autoCleanup && !env.autoCleanupEnabled) {
    return { skipped: true };
  }

  const retentionDays = policy.recycleBinRetentionDays || env.recycleBinRetentionDays;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const expired = await Paper.find({
    isDeleted: true,
    deletedAt: { $lte: cutoff },
  });

  let removed = 0;
  for (const paper of expired) {
    try {
      await deleteStoredFile(paper.storage.providerKey);
      const owner = await User.findById(paper.uploadedBy);
      if (owner) {
        owner.storageUsedBytes = Math.max(0, owner.storageUsedBytes - paper.fileSizeBytes);
        await owner.save();
      }
      await Paper.deleteOne({ _id: paper._id });
      removed += 1;
    } catch (error) {
      logger.error('Recycle bin cleanup failed for paper', {
        paperId: paper._id.toString(),
        error: error.message,
      });
    }
  }

  logger.info('Recycle bin cleanup completed', { removed, retentionDays });
  return { removed, retentionDays };
}

function startScheduledJobs() {
  // Health checks hourly
  cron.schedule('0 * * * *', async () => {
    try {
      await monitoringService.runHealthChecksAndAlerts();
    } catch (error) {
      logger.error('Health check job failed', { error: error.message });
    }
  });

  // Recycle bin cleanup daily at 01:30
  cron.schedule('30 1 * * *', async () => {
    try {
      await cleanupRecycleBin();
    } catch (error) {
      logger.error('Cleanup job failed', { error: error.message });
    }
  });

  if (env.backupEnabled) {
    cron.schedule(env.backupCronDaily, async () => {
      try {
        await backupService.createBackup(null, 'daily');
      } catch (error) {
        logger.error('Daily backup failed', { error: error.message });
        await monitoringService.createAlert({
          type: 'BACKUP_FAILURE',
          severity: 'critical',
          message: `Daily backup failed: ${error.message}`,
        });
      }
    });

    cron.schedule(env.backupCronWeekly, async () => {
      try {
        await backupService.createBackup(null, 'weekly');
      } catch (error) {
        logger.error('Weekly backup failed', { error: error.message });
      }
    });

    cron.schedule(env.backupCronMonthly, async () => {
      try {
        await backupService.createBackup(null, 'monthly');
      } catch (error) {
        logger.error('Monthly backup failed', { error: error.message });
      }
    });
  }

  logger.info('Scheduled jobs registered');
}

module.exports = {
  startScheduledJobs,
  cleanupRecycleBin,
};
