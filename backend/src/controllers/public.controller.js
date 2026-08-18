const publicPaperService = require('../services/publicPaper.service');
const siteSettingsService = require('../services/siteSettings.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');
const { getDatabaseStatus } = require('../config/db');

function requestContext(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
    requestId: req.requestId,
  };
}

function assertDatabaseReady() {
  const db = getDatabaseStatus();
  if (db.status !== 'connected') {
    throw new AppError(
      'Unable to load data right now. Please try again.',
      503,
      'DATABASE_UNAVAILABLE'
    );
  }
}

/**
 * @openapi
 * /public/site-config:
 *   get:
 *     tags: [Public]
 *     summary: Institution branding and public site configuration
 */
const getSiteConfig = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await siteSettingsService.getPublicSiteConfig();
  return success(res, data, 'Site configuration fetched');
});

/**
 * @openapi
 * /public/papers:
 *   get:
 *     tags: [Public]
 *     summary: Browse and search papers
 */
const listPapers = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.listPapers(req.query);
  return success(res, data.items, 'Papers fetched', 200, data.meta);
});

/**
 * @openapi
 * /public/papers/latest:
 *   get:
 *     tags: [Public]
 *     summary: Latest uploaded papers
 */
const latestPapers = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.getLatest(req.query.limit);
  return success(res, data, 'Latest papers fetched');
});

/**
 * @openapi
 * /public/papers/popular:
 *   get:
 *     tags: [Public]
 *     summary: Popular papers by downloads/views
 */
const popularPapers = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.getPopular(req.query.limit);
  return success(res, data, 'Popular papers fetched');
});

/**
 * @openapi
 * /public/papers/{id}:
 *   get:
 *     tags: [Public]
 *     summary: Get paper details
 */
const getPaper = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.getPaperById(req.params.id);
  return success(res, data, 'Paper fetched');
});

/**
 * @openapi
 * /public/papers/{id}/view:
 *   get:
 *     tags: [Public]
 *     summary: View paper PDF and increment view count
 */
const viewPaper = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.recordView(req.params.id, requestContext(req));
  return success(res, data, 'Paper view recorded');
});

/**
 * @openapi
 * /public/papers/{id}/download:
 *   get:
 *     tags: [Public]
 *     summary: Download paper PDF and increment download count
 */
const downloadPaper = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.recordDownload(req.params.id, requestContext(req));
  return success(res, data, 'Paper download recorded');
});

/**
 * @openapi
 * /public/stats:
 *   get:
 *     tags: [Public]
 *     summary: Aggregate public statistics
 */
const getStats = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.getStats();
  return success(res, data, 'Stats fetched');
});

/**
 * @openapi
 * /public/taxonomy:
 *   get:
 *     tags: [Public]
 *     summary: Enabled academic taxonomy for filters
 */
const getTaxonomy = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.getTaxonomy();
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  return success(res, data, 'Taxonomy fetched');
});

/**
 * @openapi
 * /public/home:
 *   get:
 *     tags: [Public]
 *     summary: Bundled home page payload (stats, latest, popular, taxonomy)
 */
const getHome = asyncHandler(async (req, res) => {
  assertDatabaseReady();
  const data = await publicPaperService.getHomeBundle(req.query);
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  return success(res, data, 'Home data fetched');
});

module.exports = {
  getSiteConfig,
  listPapers,
  latestPapers,
  popularPapers,
  getPaper,
  viewPaper,
  downloadPaper,
  getStats,
  getTaxonomy,
  getHome,
};
