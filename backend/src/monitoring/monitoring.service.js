const os = require('os');
const process = require('process');
const Notification = require('../models/Notification');
const Paper = require('../models/Paper');
const User = require('../models/User');
const BackupRecord = require('../models/BackupRecord');
const { getDatabaseStatus } = require('../config/db');
const { getStorageProvider } = require('../storage/storage.factory');
const { getActiveStoragePolicy } = require('../storage/storage.service');
const env = require('../config/env');
const logger = require('../config/logger');
const { ROLES } = require('../constants/roles');

async function createAlert({ type, severity, message, audience = 'superadmin', targetUserId = null, meta = {} }) {
  const notification = await Notification.create({
    type,
    severity,
    message,
    audience,
    targetUserId,
    meta,
  });
  logger.warn('System alert created', { type, severity, message });
  return notification;
}

async function collectRuntimeMetrics() {
  const mem = process.memoryUsage();
  return {
    uptimeSec: Math.round(process.uptime()),
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    loadAverage: os.loadavg(),
    cpuCount: os.cpus().length,
    memory: {
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      freeSystemMb: Math.round((os.freemem() / (1024 * 1024)) * 100) / 100,
      totalSystemMb: Math.round((os.totalmem() / (1024 * 1024)) * 100) / 100,
    },
  };
}

async function runHealthChecksAndAlerts() {
  const alerts = [];
  const db = getDatabaseStatus();
  const provider = await getStorageProvider();
  const cloud = await provider.healthCheck();
  const policy = await getActiveStoragePolicy();

  if (db.configured && db.status !== 'connected') {
    alerts.push(
      await createAlert({
        type: 'DATABASE_DOWN',
        severity: 'critical',
        message: 'Database is not connected',
        meta: db,
      })
    );
  }

  if (!cloud.ok) {
    alerts.push(
      await createAlert({
        type: 'CLOUD_FAILURE',
        severity: 'critical',
        message: `Cloud storage unhealthy: ${cloud.message || 'unknown'}`,
        meta: cloud,
      })
    );
  }

  const [storageAgg] = await Paper.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: null, bytes: { $sum: '$fileSizeBytes' } } },
  ]);
  const usedBytes = storageAgg?.bytes || 0;
  // Quota reference uses sum of admin quotas as institutional soft ceiling
  const adminCount = await User.countDocuments({ role: ROLES.ADMIN, isActive: true });
  const softCeiling = (policy.adminQuotaMb || env.adminStorageQuotaMb) * 1024 * 1024 * Math.max(adminCount, 1);
  const usagePercent = softCeiling ? (usedBytes / softCeiling) * 100 : 0;

  if (usagePercent >= (policy.criticalPercent || 95)) {
    alerts.push(
      await createAlert({
        type: 'STORAGE_CRITICAL',
        severity: 'critical',
        message: `Storage usage critical at ${usagePercent.toFixed(2)}%`,
        meta: { usedBytes, softCeiling, usagePercent },
      })
    );
  } else if (usagePercent >= (policy.warningPercent || 80)) {
    alerts.push(
      await createAlert({
        type: 'STORAGE_WARNING',
        severity: 'warning',
        message: `Storage usage warning at ${usagePercent.toFixed(2)}%`,
        meta: { usedBytes, softCeiling, usagePercent },
      })
    );
  }

  const latestBackup = await BackupRecord.findOne().sort({ createdAt: -1 });
  if (latestBackup && latestBackup.status === 'failed') {
    alerts.push(
      await createAlert({
        type: 'BACKUP_FAILURE',
        severity: 'critical',
        message: `Latest backup failed: ${latestBackup.errorMessage || 'unknown error'}`,
        meta: { backupId: latestBackup._id },
      })
    );
  }

  return {
    checkedAt: new Date().toISOString(),
    database: db,
    cloud,
    usagePercent,
    alertsCreated: alerts.length,
    alerts,
  };
}

async function getMonitoringSnapshot() {
  const runtime = await collectRuntimeMetrics();
  const db = getDatabaseStatus();
  const provider = await getStorageProvider();
  const cloud = await provider.healthCheck();

  const [activeAdmins, unreadAlerts, activeUploadsEstimate] = await Promise.all([
    User.countDocuments({ role: ROLES.ADMIN, isActive: true }),
    Notification.countDocuments({ isRead: false }),
    Paper.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      isDeleted: false,
    }),
  ]);

  return {
    runtime,
    database: db,
    cloud,
    activeAdmins,
    unreadAlerts,
    recentUploads15m: activeUploadsEstimate,
    emailStatus: env.emailEnabled ? 'enabled' : 'disabled',
    maintenanceMode: env.maintenanceMode,
  };
}

async function listAlerts(query = {}) {
  const limit = Math.min(parseInt(query.limit, 10) || 50, 200);
  const filter = {};
  if (query.isRead !== undefined) filter.isRead = query.isRead === 'true';
  if (query.severity) filter.severity = query.severity;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
}

async function markAlertRead(id) {
  return Notification.findByIdAndUpdate(
    id,
    { isRead: true, readAt: new Date() },
    { new: true }
  );
}

module.exports = {
  createAlert,
  collectRuntimeMetrics,
  runHealthChecksAndAlerts,
  getMonitoringSnapshot,
  listAlerts,
  markAlertRead,
};
