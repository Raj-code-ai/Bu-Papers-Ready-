const os = require('os');
const process = require('process');
const {
  StoragePolicy,
  SecurityPolicy,
  FeatureToggle,
  SystemConfig,
  WebsiteSettings,
  EmailSettings,
  Paper,
  User,
  Notification,
} = require('../models');
const AppError = require('../utils/AppError');
const { writeAuditLog } = require('./auditLog.service');
const { getStorageProvider, resetStorageProviderCache } = require('../storage/storage.factory');
const { getDatabaseStatus } = require('../config/db');
const { ROLES } = require('../constants/roles');
const env = require('../config/env');

function metaFrom(context = {}) {
  return {
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  };
}

async function getOrCreate(Model, defaults = {}) {
  let doc = await Model.findOne({ key: 'default' });
  if (!doc) {
    doc = await Model.create({ key: 'default', ...defaults });
  }
  return doc;
}

async function getWebsiteSettings() {
  const siteSettingsService = require('./siteSettings.service');
  return siteSettingsService.getWebsiteSettingsDoc();
}

async function updateWebsiteSettings(actor, body, context = {}) {
  const siteSettingsService = require('./siteSettings.service');
  const beforeDoc = await siteSettingsService.getWebsiteSettingsDoc();
  const before = beforeDoc.toObject();
  const branding = await siteSettingsService.updateWebsiteSettings(actor, body);
  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_WEBSITE_SETTINGS',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'WebsiteSettings',
    entityId: beforeDoc._id.toString(),
    before: {
      institutionName: before.institutionName,
      siteName: before.siteName,
      logoUrl: before.logoUrl,
    },
    after: {
      institutionName: branding.institutionName,
      siteName: branding.siteName,
      logoUrl: branding.logoUrl,
    },
    ...metaFrom(context),
  });
  return branding;
}

async function getStoragePolicy() {
  return getOrCreate(StoragePolicy, {
    maxFileSizeMb: env.maxFileSizeMb,
    adminQuotaMb: env.adminStorageQuotaMb,
    cloudProvider: env.storageProvider,
  });
}

async function updateStoragePolicy(actor, body, context = {}) {
  const doc = await getOrCreate(StoragePolicy);
  const before = doc.toObject();
  Object.assign(doc, body, { updatedBy: actor._id });
  await doc.save();
  resetStorageProviderCache();
  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_STORAGE_POLICY',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'StoragePolicy',
    entityId: doc._id.toString(),
    before,
    after: doc.toObject(),
    ...metaFrom(context),
  });
  return doc;
}

async function getSecurityPolicy() {
  return getOrCreate(SecurityPolicy);
}

async function updateSecurityPolicy(actor, body, context = {}) {
  const doc = await getOrCreate(SecurityPolicy);
  const before = doc.toObject();
  Object.assign(doc, body, { updatedBy: actor._id });
  await doc.save();
  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_SECURITY_POLICY',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'SecurityPolicy',
    entityId: doc._id.toString(),
    before,
    after: doc.toObject(),
    ...metaFrom(context),
  });
  return doc;
}

async function getSystemConfig() {
  return getOrCreate(SystemConfig, {
    maintenanceMode: env.maintenanceMode,
    maintenanceMessage: env.maintenanceMessage,
    appName: env.appName,
  });
}

async function updateSystemConfig(actor, body, context = {}) {
  const doc = await getOrCreate(SystemConfig);
  const before = doc.toObject();
  Object.assign(doc, body, { updatedBy: actor._id });
  await doc.save();
  try {
    const { clearMaintenanceCache } = require('../middlewares/maintenance.middleware');
    clearMaintenanceCache();
  } catch {
    /* ignore */
  }
  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_SYSTEM_CONFIG',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'SystemConfig',
    entityId: doc._id.toString(),
    before,
    after: doc.toObject(),
    ...metaFrom(context),
  });
  return doc;
}

async function getFeatureToggles() {
  return FeatureToggle.find().sort({ key: 1 });
}

async function updateFeatureToggle(actor, key, enabled, context = {}) {
  const doc = await FeatureToggle.findOne({ key });
  if (!doc) throw new AppError('Feature toggle not found', 404, 'NOT_FOUND');
  const before = doc.toObject();
  doc.enabled = Boolean(enabled);
  doc.updatedBy = actor._id;
  await doc.save();
  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_FEATURE_TOGGLE',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'FeatureToggle',
    entityId: doc._id.toString(),
    before,
    after: doc.toObject(),
    ...metaFrom(context),
  });
  return doc;
}

async function getEmailSettings() {
  return getOrCreate(EmailSettings);
}

async function updateEmailSettings(actor, body, context = {}) {
  const doc = await getOrCreate(EmailSettings).then(async (d) => {
    // reload with secret field when updating password
    return EmailSettings.findById(d._id).select('+smtpPass');
  });
  const before = { ...doc.toObject(), smtpPass: doc.smtpPass ? '***' : '' };
  Object.assign(doc, body, { updatedBy: actor._id });
  await doc.save();
  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_EMAIL_SETTINGS',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'EmailSettings',
    entityId: doc._id.toString(),
    before,
    after: { ...doc.toObject(), smtpPass: doc.smtpPass ? '***' : '' },
    ...metaFrom(context),
  });
  const safe = doc.toObject();
  delete safe.smtpPass;
  return safe;
}

async function storageDashboard() {
  const policy = await getStoragePolicy();
  const provider = await getStorageProvider();
  const usage = await provider.getUsageStats().catch(() => ({
    provider: policy.cloudProvider,
    storageUsedBytes: 0,
    bandwidthUsedBytes: 0,
  }));

  const [paperAgg] = await Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalBytes: { $sum: '$fileSizeBytes' },
      },
    },
  ]);

  const largestFiles = await Paper.find({ isDeleted: false })
    .sort({ fileSizeBytes: -1 })
    .limit(10)
    .select('title fileSizeBytes subjectId uploadedBy')
    .populate('subjectId', 'name')
    .populate('uploadedBy', 'name email')
    .lean();

  const adminUsage = await User.find({ role: ROLES.ADMIN })
    .select('name email storageUsedBytes isActive')
    .sort({ storageUsedBytes: -1 })
    .lean();

  const largestSubjects = await Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$subjectId',
        totalBytes: { $sum: '$fileSizeBytes' },
        files: { $sum: 1 },
      },
    },
    { $sort: { totalBytes: -1 } },
    { $limit: 10 },
  ]);

  const used = paperAgg?.totalBytes || 0;
  const budget = policy.monthlyBudgetUsd || 0;
  const estimatedCost = usage.storageUsedBytes
    ? Math.round((usage.storageUsedBytes / (1024 * 1024 * 1024)) * 0.1 * 100) / 100
    : 0;

  return {
    totalStorageTrackedBytes: used,
    cloudUsage: usage,
    remainingHint: 'Managed by cloud provider plan',
    bandwidth: usage.bandwidthUsedBytes || 0,
    cloudProvider: policy.cloudProvider,
    monthlyBudgetUsd: budget,
    monthlyCostEstimateUsd: estimatedCost,
    largestFiles,
    largestSubjects,
    adminUsage,
    warnings: {
      overWarning: policy.warningPercent,
      overCritical: policy.criticalPercent,
      budgetExceeded: budget > 0 && estimatedCost > budget,
    },
  };
}

async function systemHealthDashboard() {
  const provider = await getStorageProvider();
  const cloud = await provider.healthCheck();
  const db = getDatabaseStatus();
  const mem = process.memoryUsage();

  const [paperCount, adminCount, unreadAlerts] = await Promise.all([
    Paper.countDocuments({ isDeleted: false }),
    User.countDocuments({ role: ROLES.ADMIN, isActive: true }),
    Notification.countDocuments({ isRead: false }),
  ]);

  return {
    database: { ...db, ok: !db.configured || db.status === 'connected' },
    cloud,
    api: { ok: true, uptimeSec: Math.round(process.uptime()) },
    storage: cloud,
    cpu: { loadAverage: os.loadavg(), cores: os.cpus().length },
    memory: {
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      totalSystemMb: Math.round((os.totalmem() / (1024 * 1024)) * 100) / 100,
      freeSystemMb: Math.round((os.freemem() / (1024 * 1024)) * 100) / 100,
    },
    disk: {
      note: 'Detailed disk metrics available via host monitoring in production',
    },
    activeAdmins: adminCount,
    totalPapers: paperCount,
    unreadAlerts,
    email: {
      enabled: env.emailEnabled,
      status: env.emailEnabled ? 'configured' : 'disabled',
    },
    security: {
      superAdmin2faEnabled: env.superAdmin2faEnabled,
      helmet: true,
      rateLimit: true,
    },
  };
}

async function cloudHealthDashboard() {
  const provider = await getStorageProvider();
  const health = await provider.healthCheck();
  const usage = await provider.getUsageStats().catch((e) => ({ error: e.message }));
  return { health, usage };
}

async function superAdminDashboard() {
  const [papers] = await Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalPapers: { $sum: 1 },
        downloads: { $sum: '$downloadCount' },
        views: { $sum: '$viewCount' },
      },
    },
  ]);

  const admins = await User.countDocuments({ role: ROLES.ADMIN });
  return {
    totalPapers: papers?.totalPapers || 0,
    totalDownloads: papers?.downloads || 0,
    totalViews: papers?.views || 0,
    totalAdmins: admins,
  };
}

module.exports = {
  getWebsiteSettings,
  updateWebsiteSettings,
  getStoragePolicy,
  updateStoragePolicy,
  getSecurityPolicy,
  updateSecurityPolicy,
  getSystemConfig,
  updateSystemConfig,
  getFeatureToggles,
  updateFeatureToggle,
  getEmailSettings,
  updateEmailSettings,
  storageDashboard,
  systemHealthDashboard,
  cloudHealthDashboard,
  superAdminDashboard,
};
