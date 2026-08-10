const express = require('express');
const { body, param, validationResult } = require('express-validator');
const controller = require('../controllers/superAdmin.controller');
const { authenticate, authorize, requireTwoFactorCompleted } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');
const AppError = require('../utils/AppError');
const { MODEL_MAP } = require('../services/taxonomy.service');
const { uploadSingleImage } = require('../middlewares/upload.middleware');

const router = express.Router();

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return next(
      new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        result.array().map((item) => ({ field: item.path, msg: item.msg }))
      )
    );
  }
  return next();
}

const taxonomyResources = Object.keys(MODEL_MAP).join('|');

router.use(authenticate, authorize(ROLES.SUPER_ADMIN), requireTwoFactorCompleted);

router.get('/dashboard', controller.dashboard);

router.get('/admins', controller.listAdmins);
router.post(
  '/admins',
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 10 }),
  validate,
  controller.createAdmin
);
router.patch('/admins/:id', param('id').isMongoId(), validate, controller.updateAdmin);
router.post('/admins/:id/enable', param('id').isMongoId(), validate, controller.enableAdmin);
router.post('/admins/:id/disable', param('id').isMongoId(), validate, controller.disableAdmin);
router.delete('/admins/:id', param('id').isMongoId(), validate, controller.deleteAdmin);
router.post(
  '/admins/:id/reset-password',
  param('id').isMongoId(),
  body('newPassword').isLength({ min: 10 }),
  validate,
  controller.resetAdminPassword
);

router.get('/login-history', controller.loginHistory);
router.get('/audit-logs', controller.auditLogs);

router.get('/website', controller.getWebsite);
router.put('/website', controller.putWebsite);
router.post('/website/logo', uploadSingleImage, controller.uploadWebsiteLogo);
router.post('/website/favicon', uploadSingleImage, controller.uploadWebsiteFavicon);

router.get('/developers', controller.listDevelopers);
router.post(
  '/developers',
  body('name').trim().notEmpty().withMessage('name is required'),
  validate,
  controller.createDeveloper
);
router.patch('/developers/:id', param('id').isMongoId(), validate, controller.updateDeveloper);
router.delete('/developers/:id', param('id').isMongoId(), validate, controller.deleteDeveloper);
router.post(
  '/developers/:id/photo',
  param('id').isMongoId(),
  validate,
  uploadSingleImage,
  controller.uploadDeveloperPhoto
);

router.get('/storage-policy', controller.getStoragePolicy);
router.put('/storage-policy', controller.putStoragePolicy);
router.get('/security-policy', controller.getSecurityPolicy);
router.put('/security-policy', controller.putSecurityPolicy);
router.get('/system-config', controller.getSystemConfig);
router.put('/system-config', controller.putSystemConfig);
router.get('/features', controller.getFeatures);
router.put(
  '/features/:key',
  param('key').notEmpty(),
  body('enabled').isBoolean(),
  validate,
  controller.putFeature
);
router.get('/email-settings', controller.getEmail);
router.put('/email-settings', controller.putEmail);

router.get('/storage-dashboard', controller.storageDashboard);
router.get('/system-health', controller.systemHealth);
router.get('/cloud-health', controller.cloudHealth);

router.get('/backups', controller.listBackups);
router.post('/backups', controller.createBackup);
router.post('/backups/:id/verify', param('id').isMongoId(), validate, controller.verifyBackup);
router.post('/backups/:id/restore', param('id').isMongoId(), validate, controller.restoreBackup);
router.get('/backups/:id/download', param('id').isMongoId(), validate, controller.downloadBackup);

router.get(`/:resource(${taxonomyResources})`, controller.listTaxonomy);
router.post(
  `/:resource(${taxonomyResources})`,
  body('name').trim().notEmpty(),
  validate,
  controller.createTaxonomy
);
router.patch(
  `/:resource(${taxonomyResources})/:id`,
  param('id').isMongoId(),
  validate,
  controller.updateTaxonomy
);
router.delete(
  `/:resource(${taxonomyResources})/:id`,
  param('id').isMongoId(),
  validate,
  controller.deleteTaxonomy
);
router.post(
  `/:resource(${taxonomyResources})/reorder`,
  body('orderedIds').isArray({ min: 1 }),
  validate,
  controller.reorderTaxonomy
);

module.exports = router;
