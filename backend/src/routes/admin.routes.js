const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, authorize, requireTwoFactorCompleted } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');
const { uploadSinglePdf, uploadMultiplePdfs } = require('../middlewares/upload.middleware');
const { createUploadRateLimiter } = require('../config/rateLimit');
const {
  idParam,
  uploadValidators,
  bulkUploadValidators,
  updateValidators,
  listValidators,
} = require('../validators/admin.validators');

const router = express.Router();
const uploadLimiter = createUploadRateLimiter();

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN), requireTwoFactorCompleted);

router.get('/dashboard', adminController.dashboard);
router.get('/papers', listValidators, adminController.listPapers);
router.post(
  '/papers/upload',
  uploadLimiter,
  uploadSinglePdf,
  uploadValidators,
  adminController.uploadPaper
);
router.post(
  '/papers/bulk-upload',
  uploadLimiter,
  uploadMultiplePdfs,
  bulkUploadValidators,
  adminController.bulkUpload
);
router.patch('/papers/:id', idParam, updateValidators, adminController.updateMetadata);
router.put(
  '/papers/:id/replace',
  uploadLimiter,
  idParam,
  uploadSinglePdf,
  adminController.replacePdf
);
router.delete('/papers/:id', idParam, adminController.softDelete);

router.get('/recycle-bin', listValidators, adminController.recycleBin);
router.post('/recycle-bin/:id/restore', idParam, adminController.restore);
router.delete('/recycle-bin/:id', idParam, adminController.permanentDelete);

router.get('/uploads/history', listValidators, adminController.uploadHistory);
router.get('/storage', adminController.storageDashboard);
router.get('/duplicates', listValidators, adminController.duplicates);
router.get('/analytics', adminController.analytics);
router.post('/papers/:id/publish', idParam, adminController.publishPaper);
router.post('/papers/:id/unpublish', idParam, adminController.unpublishPaper);

module.exports = router;
