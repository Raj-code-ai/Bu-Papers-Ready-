const crypto = require('crypto');
const paperRepository = require('../repositories/paper.repository');
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

function hashIp(ip) {
  if (!ip) return '';
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

async function getEnabledFeatureKeys() {
  const toggles = await FeatureToggle.find({ enabled: true }).select('key').lean();
  return new Set(toggles.map((item) => item.key));
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
      filter[field] = query[field];
    }
  }

  if (query.q) {
    filter.$text = { $search: String(query.q).trim() };
  }

  const enabledFeatures = await getEnabledFeatureKeys();
  const resourceTypes = await ResourceType.find({ isEnabled: true }).select('_id featureKey').lean();
  const allowedTypeIds = resourceTypes
    .filter((type) => !type.featureKey || enabledFeatures.has(type.featureKey))
    .map((type) => type._id);

  filter.resourceTypeId = filter.resourceTypeId
    ? filter.resourceTypeId
    : { $in: allowedTypeIds };

  if (filter.resourceTypeId && !filter.resourceTypeId.$in) {
    const stillAllowed = allowedTypeIds.some((id) => String(id) === String(filter.resourceTypeId));
    if (!stillAllowed) {
      throw new AppError('Requested resource type is disabled', 404, 'NOT_FOUND');
    }
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
  const filter = await buildPublicPaperFilter(query);

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .populate(publicPopulate)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-storage.raw -fileHash')
      .lean(),
    Paper.countDocuments(filter),
  ]);

  return {
    items,
    meta: buildMeta({ page, limit, total }),
  };
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

  return {
    totalPapers: totals?.totalPapers || 0,
    totalDownloads: totals?.totalDownloads || 0,
    totalViews: totals?.totalViews || 0,
  };
}

async function getLatest(limit = 10) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  return Paper.find({ isDeleted: false, status: 'published' })
    .populate(publicPopulate)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select('-storage.raw -fileHash')
    .lean();
}

async function getPopular(limit = 10) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50);
  return Paper.find({ isDeleted: false, status: 'published' })
    .populate(publicPopulate)
    .sort({ downloadCount: -1, viewCount: -1 })
    .limit(safeLimit)
    .select('-storage.raw -fileHash')
    .lean();
}

async function getTaxonomy() {
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
    AcademicLevel.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Programme.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Department.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Semester.find({ isEnabled: true }).sort({ order: 1, number: 1 }).lean(),
    ClassNode.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Subject.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    ResourceType.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    PaperType.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    WebsiteSettings.findOne({ key: 'default' }).lean(),
    SystemConfig.findOne({ key: 'default' }).lean(),
    FeatureToggle.find().lean(),
  ]);

  const enabledFeatures = new Set(
    featureToggles.filter((item) => item.enabled).map((item) => item.key)
  );

  return {
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
};
