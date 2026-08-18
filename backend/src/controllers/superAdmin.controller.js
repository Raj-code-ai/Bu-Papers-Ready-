const path = require('path');
const userService = require('../services/superAdminUser.service');
const taxonomyService = require('../services/taxonomy.service');
const systemService = require('../services/superAdminSystem.service');
const backupService = require('../services/backup.service');
const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/apiResponse');

function ctx(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '', requestId: req.requestId };
}

const dashboard = asyncHandler(async (req, res) => {
  return success(res, await systemService.superAdminDashboard(), 'Dashboard fetched');
});

const listAdmins = asyncHandler(async (req, res) => {
  const data = await userService.listAdmins(req.query);
  return success(res, data.items, 'Admins fetched', 200, data.meta);
});

const createAdmin = asyncHandler(async (req, res) => {
  const data = await userService.createAdmin(req.user, req.body, ctx(req));
  return created(res, data, 'Admin created');
});

const updateAdmin = asyncHandler(async (req, res) => {
  const data = await userService.updateAdmin(req.user, req.params.id, req.body, ctx(req));
  return success(res, data, 'Admin updated');
});

const enableAdmin = asyncHandler(async (req, res) => {
  const data = await userService.setAdminActive(req.user, req.params.id, true, ctx(req));
  return success(res, data, 'Admin enabled');
});

const disableAdmin = asyncHandler(async (req, res) => {
  const data = await userService.setAdminActive(req.user, req.params.id, false, ctx(req));
  return success(res, data, 'Admin disabled');
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const data = await userService.deleteAdmin(req.user, req.params.id, ctx(req));
  return success(res, data, 'Admin deleted');
});

const resetAdminPassword = asyncHandler(async (req, res) => {
  const data = await userService.resetAdminPassword(
    req.user,
    req.params.id,
    req.body.newPassword,
    ctx(req)
  );
  return success(res, data, 'Admin password reset');
});

const loginHistory = asyncHandler(async (req, res) => {
  const data = await userService.listLoginHistory(req.query);
  return success(res, data.items, 'Login history fetched', 200, data.meta);
});

const auditLogs = asyncHandler(async (req, res) => {
  const data = await userService.listAuditLogs(req.query);
  return success(res, data.items, 'Audit logs fetched', 200, data.meta);
});

const listTaxonomy = asyncHandler(async (req, res) => {
  const data = await taxonomyService.listTaxonomy(req.params.resource, req.query);
  return success(res, data.items, 'Taxonomy fetched', 200, data.meta);
});

const ensureStandardSemesters = asyncHandler(async (req, res) => {
  const data = await taxonomyService.ensureStandardSemesters(req.user, ctx(req));
  return success(res, data, 'Standard UG/PG semesters ensured');
});

const createTaxonomy = asyncHandler(async (req, res) => {
  const data = await taxonomyService.createTaxonomy(
    req.user,
    req.params.resource,
    req.body,
    ctx(req)
  );
  return created(res, data, 'Taxonomy item created');
});

const updateTaxonomy = asyncHandler(async (req, res) => {
  const data = await taxonomyService.updateTaxonomy(
    req.user,
    req.params.resource,
    req.params.id,
    req.body,
    ctx(req)
  );
  return success(res, data, 'Taxonomy item updated');
});

const deleteTaxonomy = asyncHandler(async (req, res) => {
  const data = await taxonomyService.deleteTaxonomy(
    req.user,
    req.params.resource,
    req.params.id,
    ctx(req)
  );
  return success(res, data, 'Taxonomy item deleted');
});

const reorderTaxonomy = asyncHandler(async (req, res) => {
  const data = await taxonomyService.reorderTaxonomy(
    req.user,
    req.params.resource,
    req.body.orderedIds,
    ctx(req)
  );
  return success(res, data, 'Taxonomy reordered');
});

const getWebsite = asyncHandler(async (req, res) => {
  return success(res, await systemService.getWebsiteSettings(), 'Website settings fetched');
});
const putWebsite = asyncHandler(async (req, res) => {
  return success(
    res,
    await systemService.updateWebsiteSettings(req.user, req.body, ctx(req)),
    'Website settings updated'
  );
});

const uploadWebsiteLogo = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return success(
    res,
    await siteSettingsService.uploadBrandingImage(req.user, 'logo', req.file, ctx(req)),
    'Logo uploaded'
  );
});

const uploadWebsiteFavicon = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return success(
    res,
    await siteSettingsService.uploadBrandingImage(req.user, 'favicon', req.file, ctx(req)),
    'Favicon uploaded'
  );
});

const listDevelopers = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return success(res, await siteSettingsService.listDevelopers(), 'Developers fetched');
});

const createDeveloper = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return created(
    res,
    await siteSettingsService.createDeveloper(req.user, req.body, ctx(req)),
    'Developer created'
  );
});

const updateDeveloper = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return success(
    res,
    await siteSettingsService.updateDeveloper(req.user, req.params.id, req.body, ctx(req)),
    'Developer updated'
  );
});

const deleteDeveloper = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return success(
    res,
    await siteSettingsService.deleteDeveloper(req.user, req.params.id, ctx(req)),
    'Developer deleted'
  );
});

const uploadDeveloperPhoto = asyncHandler(async (req, res) => {
  const siteSettingsService = require('../services/siteSettings.service');
  return success(
    res,
    await siteSettingsService.uploadDeveloperPhoto(req.user, req.params.id, req.file, ctx(req)),
    'Developer photo uploaded'
  );
});

const getStoragePolicy = asyncHandler(async (req, res) => {
  return success(res, await systemService.getStoragePolicy(), 'Storage policy fetched');
});
const putStoragePolicy = asyncHandler(async (req, res) => {
  return success(
    res,
    await systemService.updateStoragePolicy(req.user, req.body, ctx(req)),
    'Storage policy updated'
  );
});

const getSecurityPolicy = asyncHandler(async (req, res) => {
  return success(res, await systemService.getSecurityPolicy(), 'Security policy fetched');
});
const putSecurityPolicy = asyncHandler(async (req, res) => {
  return success(
    res,
    await systemService.updateSecurityPolicy(req.user, req.body, ctx(req)),
    'Security policy updated'
  );
});

const getSystemConfig = asyncHandler(async (req, res) => {
  return success(res, await systemService.getSystemConfig(), 'System config fetched');
});
const putSystemConfig = asyncHandler(async (req, res) => {
  return success(
    res,
    await systemService.updateSystemConfig(req.user, req.body, ctx(req)),
    'System config updated'
  );
});

const getFeatures = asyncHandler(async (req, res) => {
  return success(res, await systemService.getFeatureToggles(), 'Feature toggles fetched');
});
const putFeature = asyncHandler(async (req, res) => {
  return success(
    res,
    await systemService.updateFeatureToggle(req.user, req.params.key, req.body.enabled, ctx(req)),
    'Feature toggle updated'
  );
});

const getEmail = asyncHandler(async (req, res) => {
  return success(res, await systemService.getEmailSettings(), 'Email settings fetched');
});
const putEmail = asyncHandler(async (req, res) => {
  return success(
    res,
    await systemService.updateEmailSettings(req.user, req.body, ctx(req)),
    'Email settings updated'
  );
});

const storageDashboard = asyncHandler(async (req, res) => {
  return success(res, await systemService.storageDashboard(), 'Storage dashboard fetched');
});
const systemHealth = asyncHandler(async (req, res) => {
  return success(res, await systemService.systemHealthDashboard(), 'System health fetched');
});
const cloudHealth = asyncHandler(async (req, res) => {
  return success(res, await systemService.cloudHealthDashboard(), 'Cloud health fetched');
});

const createBackup = asyncHandler(async (req, res) => {
  const data = await backupService.createBackup(req.user, req.body.type || 'manual', ctx(req));
  return created(res, data, 'Backup created');
});
const listBackups = asyncHandler(async (req, res) => {
  const data = await backupService.listBackups(req.query);
  return success(res, data.items, 'Backups fetched', 200, data.meta);
});
const verifyBackup = asyncHandler(async (req, res) => {
  return success(res, await backupService.verifyBackup(req.params.id), 'Backup verified');
});
const restoreBackup = asyncHandler(async (req, res) => {
  return success(
    res,
    await backupService.restoreBackup(req.user, req.params.id, ctx(req)),
    'Backup restore started'
  );
});
const downloadBackup = asyncHandler(async (req, res) => {
  const record = await backupService.getBackupFile(req.params.id);
  return res.download(record.path, path.basename(record.path));
});

module.exports = {
  dashboard,
  listAdmins,
  createAdmin,
  updateAdmin,
  enableAdmin,
  disableAdmin,
  deleteAdmin,
  resetAdminPassword,
  loginHistory,
  auditLogs,
  listTaxonomy,
  createTaxonomy,
  ensureStandardSemesters,
  updateTaxonomy,
  deleteTaxonomy,
  reorderTaxonomy,
  getWebsite,
  putWebsite,
  uploadWebsiteLogo,
  uploadWebsiteFavicon,
  listDevelopers,
  createDeveloper,
  updateDeveloper,
  deleteDeveloper,
  uploadDeveloperPhoto,
  getStoragePolicy,
  putStoragePolicy,
  getSecurityPolicy,
  putSecurityPolicy,
  getSystemConfig,
  putSystemConfig,
  getFeatures,
  putFeature,
  getEmail,
  putEmail,
  storageDashboard,
  systemHealth,
  cloudHealth,
  createBackup,
  listBackups,
  verifyBackup,
  restoreBackup,
  downloadBackup,
};
