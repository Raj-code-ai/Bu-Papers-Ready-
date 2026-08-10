const adminPaperService = require('../services/adminPaper.service');
const asyncHandler = require('../utils/asyncHandler');
const { success, created } = require('../utils/apiResponse');

function requestContext(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
    requestId: req.requestId,
  };
}

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Admin dashboard summary
 *     security:
 *       - bearerAuth: []
 */
const dashboard = asyncHandler(async (req, res) => {
  const data = await adminPaperService.getDashboard(req.user);
  return success(res, data, 'Admin dashboard fetched');
});

const listPapers = asyncHandler(async (req, res) => {
  const data = await adminPaperService.listOwnPapers(req.user, req.query);
  return success(res, data.items, 'Papers fetched', 200, data.meta);
});

const uploadPaper = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.uploadPaper(
    req.user,
    req.file,
    req.body,
    requestContext(req)
  );
  return created(res, paper, 'Paper uploaded');
});

const bulkUpload = asyncHandler(async (req, res) => {
  const data = await adminPaperService.bulkUpload(
    req.user,
    req.files,
    req.body,
    requestContext(req)
  );
  return created(res, data, 'Bulk upload processed');
});

const updateMetadata = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.updateMetadata(
    req.user,
    req.params.id,
    req.body,
    requestContext(req)
  );
  return success(res, paper, 'Paper metadata updated');
});

const replacePdf = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.replacePaperPdf(
    req.user,
    req.params.id,
    req.file,
    requestContext(req)
  );
  return success(res, paper, 'PDF replaced');
});

const softDelete = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.softDeletePaper(
    req.user,
    req.params.id,
    requestContext(req)
  );
  return success(res, paper, 'Paper moved to recycle bin');
});

const recycleBin = asyncHandler(async (req, res) => {
  const data = await adminPaperService.listRecycleBin(req.user, req.query);
  return success(res, data.items, 'Recycle bin fetched', 200, data.meta);
});

const restore = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.restorePaper(
    req.user,
    req.params.id,
    requestContext(req)
  );
  return success(res, paper, 'Paper restored');
});

const permanentDelete = asyncHandler(async (req, res) => {
  const data = await adminPaperService.permanentDeletePaper(
    req.user,
    req.params.id,
    requestContext(req)
  );
  return success(res, data, 'Paper permanently deleted');
});

const uploadHistory = asyncHandler(async (req, res) => {
  const data = await adminPaperService.uploadHistory(req.user, req.query);
  return success(res, data.items, 'Upload history fetched', 200, data.meta);
});

const storageDashboard = asyncHandler(async (req, res) => {
  const data = await adminPaperService.storageDashboard(req.user);
  return success(res, data, 'Storage dashboard fetched');
});

const duplicates = asyncHandler(async (req, res) => {
  const data = await adminPaperService.listDuplicates(req.user, req.query);
  return success(res, data.items, 'Duplicates fetched', 200, data.meta);
});

const analytics = asyncHandler(async (req, res) => {
  const data = await adminPaperService.ownAnalytics(req.user);
  return success(res, data, 'Admin analytics fetched');
});

const publishPaper = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.publishPaper(req.user, req.params.id, requestContext(req));
  return success(res, paper, 'Paper published');
});

const unpublishPaper = asyncHandler(async (req, res) => {
  const paper = await adminPaperService.unpublishPaper(req.user, req.params.id, requestContext(req));
  return success(res, paper, 'Paper moved to draft');
});

module.exports = {
  dashboard,
  listPapers,
  uploadPaper,
  bulkUpload,
  updateMetadata,
  replacePdf,
  softDelete,
  recycleBin,
  restore,
  permanentDelete,
  uploadHistory,
  storageDashboard,
  duplicates,
  analytics,
  publishPaper,
  unpublishPaper,
};
