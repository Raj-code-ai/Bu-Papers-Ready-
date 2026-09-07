const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  AcademicLevel,
  Programme,
  Department,
  Semester,
  ClassNode,
  Subject,
  ResourceType,
  PaperType,
  Paper,
  FeatureToggle,
  WebsiteSettings,
  SystemConfig,
} = require('../models');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta, parseSort } = require('../utils/pagination');
const { writeAuditLog } = require('./auditLog.service');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const memoryCache = require('../utils/memoryCache');

const PUBLIC_CACHE_TTL_MS = 45_000;
const LIST_CACHE_TTL_MS = 30_000;
const TAXONOMY_SELECT =
  'name slug kind order academicLevelId programmeId parentProgrammeId departmentId semesterId classNodeId number code featureKey';
const LIST_SELECT =
  'title downloadCount viewCount academicLevelId programmeId departmentId semesterId classNodeId subjectId resourceTypeId paperTypeId createdAt';

function asObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  const raw = String(value);
  if (!mongoose.isValidObjectId(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashIp(ip) {
  if (!ip) return '';
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

async function getEnabledFeatureKeys() {
  const cached = memoryCache.get('feature-keys');
  if (cached) return cached;
  const toggles = await FeatureToggle.find({ enabled: true }).select('key').lean();
  const keys = new Set(toggles.map((item) => item.key));
  return memoryCache.set('feature-keys', keys, PUBLIC_CACHE_TTL_MS);
}

async function getAllowedResourceTypeIds() {
  const cached = memoryCache.get('allowed-resource-types');
  if (cached) return cached;
  const enabledFeatures = await getEnabledFeatureKeys();
  const resourceTypes = await ResourceType.find({ isEnabled: true }).select('_id featureKey').lean();
  const allowedTypeIds = resourceTypes
    .filter((type) => !type.featureKey || enabledFeatures.has(type.featureKey))
    .map((type) => type._id);
  return memoryCache.set('allowed-resource-types', allowedTypeIds, PUBLIC_CACHE_TTL_MS);
}

async function buildPublicPaperFilter(query) {
  const filter = {
    isDeleted: false,
    status: 'published',
  };

  const objectFields = [
    'academicLevelId',
    'programmeId',
    'departmentId',
    'semesterId',
    'classNodeId',
    'subjectId',
    'academicYearId',
    'resourceTypeId',
    'paperTypeId',
  ];

  for (const field of objectFields) {
    if (query[field]) {
      const id = asObjectId(query[field]);
      if (id) filter[field] = id;
    }
  }

  const q = String(query.q || '').trim();
  if (q) {
    filter.$or = [
      { title: { $regex: escapeRegex(q), $options: 'i' } },
      { description: { $regex: escapeRegex(q), $options: 'i' } },
      { originalFileName: { $regex: escapeRegex(q), $options: 'i' } },
      { tags: { $regex: escapeRegex(q), $options: 'i' } },
    ];
  }

  const allowedTypeIds = await getAllowedResourceTypeIds();

  if (filter.resourceTypeId) {
    const stillAllowed =
      !allowedTypeIds.length ||
      allowedTypeIds.some((id) => String(id) === String(filter.resourceTypeId));
    if (!stillAllowed) {
      throw new AppError('Requested resource type is disabled', 404, 'NOT_FOUND');
    }
  } else if (allowedTypeIds.length) {
    filter.resourceTypeId = { $in: allowedTypeIds };
  }

  return filter;
}

const publicPopulate = [
  { path: 'academicLevelId', select: 'name slug' },
  { path: 'programmeId', select: 'name slug' },
  { path: 'departmentId', select: 'name slug' },
  { path: 'semesterId', select: 'name slug number' },
  { path: 'classNodeId', select: 'name slug' },
  { path: 'subjectId', select: 'name slug code' },
  { path: 'resourceTypeId', select: 'name slug' },
  { path: 'academicYearId', select: 'name slug' },
  { path: 'paperTypeId', select: 'name slug' },
];

async function listPapers(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, ['createdAt', 'viewCount', 'downloadCount', 'title'], {
    createdAt: -1,
  });
  const cacheKey = `public-papers:${JSON.stringify({
    page,
    limit,
    sort,
    q: String(query.q || '').trim(),
    academicLevelId: query.academicLevelId || '',
    programmeId: query.programmeId || '',
    departmentId: query.departmentId || '',
    semesterId: query.semesterId || '',
    classNodeId: query.classNodeId || '',
    subjectId: query.subjectId || '',
    academicYearId: query.academicYearId || '',
    resourceTypeId: query.resourceTypeId || '',
    paperTypeId: query.paperTypeId || '',
  })}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const filter = await buildPublicPaperFilter(query);

  const items = await Paper.find(filter)
    .populate(publicPopulate)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .select(LIST_SELECT)
    .maxTimeMS(12000)
    .lean();

  let total = skip + items.length;
  try {
    total = await Paper.countDocuments(filter).maxTimeMS(5000);
  } catch {
    if (items.length === limit) total = skip + items.length + 1;
  }

  const data = {
    items,
    meta: buildMeta({ page, limit, total }),
  };
  return memoryCache.set(cacheKey, data, LIST_CACHE_TTL_MS);
}

async function getPaperById(id) {
  const paper = await Paper.findOne({
    _id: id,
    isDeleted: false,
    status: 'published',
  })
    .populate(publicPopulate)
    .select('-storage.raw')
    .lean();

  if (!paper) {
    throw new AppError('Paper not found', 404, 'NOT_FOUND');
  }

  return paper;
}

async function recordView(id, context = {}) {
  const paper = await Paper.findOneAndUpdate(
    { _id: id, isDeleted: false, status: 'published' },
    { $inc: { viewCount: 1 } },
    { new: true }
  )
    .populate(publicPopulate)
    .select('-storage.raw');

  if (!paper) {
    throw new AppError('Paper not found', 404, 'NOT_FOUND');
  }

  await AnalyticsEvent.create({
    paperId: paper._id,
    type: 'view',
    ipHash: hashIp(context.ip),
    userAgent: context.userAgent || '',
  });

  return {
    paper,
    viewUrl: paper.storage.secureUrl || paper.storage.url,
  };
}

async function recordDownload(id, context = {}) {
  const paper = await Paper.findOneAndUpdate(
    { _id: id, isDeleted: false, status: 'published' },
    { $inc: { downloadCount: 1 } },
    { new: true }
  )
    .populate(publicPopulate)
    .select('-storage.raw');

  if (!paper) {
    throw new AppError('Paper not found', 404, 'NOT_FOUND');
  }

  await AnalyticsEvent.create({
    paperId: paper._id,
    type: 'download',
    ipHash: hashIp(context.ip),
    userAgent: context.userAgent || '',
  });

  await writeAuditLog({
    action: 'PUBLIC_PAPER_DOWNLOAD',
    entityType: 'Paper',
    entityId: paper._id.toString(),
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
    meta: { title: paper.title },
  });

  return {
    paper,
    downloadUrl: paper.storage.secureUrl || paper.storage.url,
    fileName: paper.originalFileName,
  };
}

async function getStats() {
  const cached = memoryCache.get('public-stats');
  if (cached) return cached;

  const [totals] = await Paper.aggregate([
    { $match: { isDeleted: false, status: 'published' } },
    {
      $group: {
        _id: null,
        totalPapers: { $sum: 1 },
        totalDownloads: { $sum: '$downloadCount' },
        totalViews: { $sum: '$viewCount' },
      },
    },
  ]);

  const data = {
    totalPapers: totals?.totalPapers || 0,
    totalDownloads: totals?.totalDownloads || 0,
    totalViews: totals?.totalViews || 0,
  };
  return memoryCache.set('public-stats', data, PUBLIC_CACHE_TTL_MS);
}

async function getLatest(limit = 10) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const cacheKey = `public-latest:${safeLimit}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const items = await Paper.find({ isDeleted: false, status: 'published' })
    .populate(publicPopulate)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('-storage.raw -fileHash')
    .lean();
  return memoryCache.set(cacheKey, items, PUBLIC_CACHE_TTL_MS);
}

async function getPopular(limit = 10) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  const cacheKey = `public-popular:${safeLimit}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const items = await Paper.find({ isDeleted: false, status: 'published' })
    .populate(publicPopulate)
    .sort({ downloadCount: -1, viewCount: -1 })
    .limit(safeLimit)
    .select('-storage.raw -fileHash')
    .lean();
  return memoryCache.set(cacheKey, items, PUBLIC_CACHE_TTL_MS);
}

async function getTaxonomy() {
  const cached = memoryCache.get('public-taxonomy');
  if (cached) return cached;

  const [
    levels,
    programmes,
    departments,
    semesters,
    classes,
    subjects,
    resourceTypes,
    paperTypes,
    website,
    system,
    featureToggles,
  ] = await Promise.all([
    AcademicLevel.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    Programme.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    Department.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    Semester.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1, number: 1 }).lean(),
    ClassNode.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    Subject.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    ResourceType.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    PaperType.find({ isEnabled: true }).select(TAXONOMY_SELECT).sort({ order: 1 }).lean(),
    WebsiteSettings.findOne({ key: 'default' }).lean(),
    SystemConfig.findOne({ key: 'default' }).lean(),
    FeatureToggle.find().lean(),
  ]);

  const enabledFeatures = new Set(
    featureToggles.filter((item) => item.enabled).map((item) => item.key)
  );

  const data = {
    academicLevels: levels,
    programmes,
    departments,
    semesters,
    classes,
    subjects,
    resourceTypes: resourceTypes.filter(
      (type) => !type.featureKey || enabledFeatures.has(type.featureKey)
    ),
    paperTypes,
    website: website || null,
    maintenanceMode: system?.maintenanceMode || false,
    featureToggles: featureToggles.map((item) => ({
      key: item.key,
      name: item.name,
      enabled: item.enabled,
    })),
    tree: {
      levels,
      programmes,
      departments,
      semesters,
      classes,
      subjects,
    },
  };
  return memoryCache.set('public-taxonomy', data, PUBLIC_CACHE_TTL_MS);
}

async function getHomeBundle(query = {}) {
  const latestLimit = Math.min(Math.max(parseInt(query.latestLimit, 10) || 6, 1), 20);
  const popularLimit = Math.min(Math.max(parseInt(query.popularLimit, 10) || 6, 1), 20);
  const cacheKey = `public-home:${latestLimit}:${popularLimit}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const [stats, latest, popular, taxonomy] = await Promise.all([
    getStats(),
    getLatest(latestLimit),
    getPopular(popularLimit),
    getTaxonomy(),
  ]);

  const data = { stats, latest, popular, taxonomy };
  return memoryCache.set(cacheKey, data, PUBLIC_CACHE_TTL_MS);
}

module.exports = {
  listPapers,
  getPaperById,
  recordView,
  recordDownload,
  getStats,
  getLatest,
  getPopular,
  getTaxonomy,
  getHomeBundle,
};
