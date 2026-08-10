const Paper = require('../models/Paper');
const User = require('../models/User');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { ROLES } = require('../constants/roles');
const { parsePagination, buildMeta } = require('../utils/pagination');

async function overview() {
  const [totals] = await Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalPapers: { $sum: 1 },
        totalDownloads: { $sum: '$downloadCount' },
        totalViews: { $sum: '$viewCount' },
        totalStorageBytes: { $sum: '$fileSizeBytes' },
      },
    },
  ]);

  return {
    totalPapers: totals?.totalPapers || 0,
    totalDownloads: totals?.totalDownloads || 0,
    totalViews: totals?.totalViews || 0,
    totalStorageBytes: totals?.totalStorageBytes || 0,
  };
}

async function downloadsBySubject(limit = 20) {
  return Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$subjectId',
        downloads: { $sum: '$downloadCount' },
        views: { $sum: '$viewCount' },
        papers: { $sum: 1 },
      },
    },
    { $sort: { downloads: -1 } },
    { $limit: Math.min(Number(limit) || 20, 100) },
    {
      $lookup: {
        from: 'subjects',
        localField: '_id',
        foreignField: '_id',
        as: 'subject',
      },
    },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        subjectId: '$_id',
        name: '$subject.name',
        downloads: 1,
        views: 1,
        papers: 1,
      },
    },
  ]);
}

async function downloadsByDepartment(limit = 20) {
  return Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$departmentId',
        downloads: { $sum: '$downloadCount' },
        views: { $sum: '$viewCount' },
        papers: { $sum: 1 },
      },
    },
    { $sort: { downloads: -1 } },
    { $limit: Math.min(Number(limit) || 20, 100) },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'department',
      },
    },
    { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        departmentId: '$_id',
        name: '$department.name',
        downloads: 1,
        views: 1,
        papers: 1,
      },
    },
  ]);
}

async function downloadsByAcademicLevel(limit = 20) {
  return Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$academicLevelId',
        downloads: { $sum: '$downloadCount' },
        views: { $sum: '$viewCount' },
        papers: { $sum: 1 },
      },
    },
    { $sort: { downloads: -1 } },
    { $limit: Math.min(Number(limit) || 20, 100) },
    {
      $lookup: {
        from: 'academiclevels',
        localField: '_id',
        foreignField: '_id',
        as: 'level',
      },
    },
    { $unwind: { path: '$level', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        academicLevelId: '$_id',
        name: '$level.name',
        downloads: 1,
        views: 1,
        papers: 1,
      },
    },
  ]);
}

async function monthlyReport(year = new Date().getFullYear()) {
  const start = new Date(Number(year), 0, 1);
  const end = new Date(Number(year) + 1, 0, 1);

  const uploads = await Paper.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { $month: '$createdAt' },
        papersUploaded: { $sum: 1 },
        storageBytes: { $sum: '$fileSizeBytes' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const events = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: {
          month: { $month: '$createdAt' },
          type: '$type',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const upload = uploads.find((u) => u._id === i + 1);
    const views = events.find((e) => e._id.month === i + 1 && e._id.type === 'view');
    const downloads = events.find((e) => e._id.month === i + 1 && e._id.type === 'download');
    return {
      month: i + 1,
      papersUploaded: upload?.papersUploaded || 0,
      storageBytes: upload?.storageBytes || 0,
      views: views?.count || 0,
      downloads: downloads?.count || 0,
    };
  });

  return { year: Number(year), months };
}

async function yearlyReport(yearsBack = 5) {
  const current = new Date().getFullYear();
  const startYear = current - (Math.min(Number(yearsBack) || 5, 20) - 1);
  const start = new Date(startYear, 0, 1);

  const uploads = await Paper.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: { $year: '$createdAt' },
        papersUploaded: { $sum: 1 },
        storageBytes: { $sum: '$fileSizeBytes' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const events = await AnalyticsEvent.aggregate([
    { $match: { createdAt: { $gte: start } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          type: '$type',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const years = [];
  for (let y = startYear; y <= current; y += 1) {
    const upload = uploads.find((u) => u._id === y);
    const views = events.find((e) => e._id.year === y && e._id.type === 'view');
    const downloads = events.find((e) => e._id.year === y && e._id.type === 'download');
    years.push({
      year: y,
      papersUploaded: upload?.papersUploaded || 0,
      storageBytes: upload?.storageBytes || 0,
      views: views?.count || 0,
      downloads: downloads?.count || 0,
    });
  }

  return { years };
}

async function storageReport() {
  const byProvider = await Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$storage.provider',
        files: { $sum: 1 },
        bytes: { $sum: '$fileSizeBytes' },
      },
    },
  ]);

  const growth = await Paper.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        bytes: { $sum: '$fileSizeBytes' },
        files: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return { byProvider, growth };
}

async function adminReport(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const admins = await User.find({ role: ROLES.ADMIN })
    .sort({ storageUsedBytes: -1 })
    .skip(skip)
    .limit(limit)
    .select('name email isActive storageUsedBytes lastLoginAt createdAt')
    .lean();

  const total = await User.countDocuments({ role: ROLES.ADMIN });

  const withStats = await Promise.all(
    admins.map(async (admin) => {
      const [stats] = await Paper.aggregate([
        { $match: { uploadedBy: admin._id, isDeleted: false } },
        {
          $group: {
            _id: null,
            papers: { $sum: 1 },
            downloads: { $sum: '$downloadCount' },
            views: { $sum: '$viewCount' },
          },
        },
      ]);
      return {
        ...admin,
        papers: stats?.papers || 0,
        downloads: stats?.downloads || 0,
        views: stats?.views || 0,
      };
    })
  );

  return { items: withStats, meta: buildMeta({ page, limit, total }) };
}

module.exports = {
  overview,
  downloadsBySubject,
  downloadsByDepartment,
  downloadsByAcademicLevel,
  monthlyReport,
  yearlyReport,
  storageReport,
  adminReport,
};
