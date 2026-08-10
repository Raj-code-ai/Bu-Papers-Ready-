const Paper = require('../models/Paper');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {
  AcademicLevel,
  Programme,
  Department,
  Semester,
  ClassNode,
  Subject,
  ResourceType,
  AcademicYear,
} = require('../models');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta, parseSort } = require('../utils/pagination');
const { writeAuditLog } = require('./auditLog.service');
const {
  uploadPdf,
  replacePdf,
  deleteStoredFile,
  getActiveStoragePolicy,
  computeFileHash,
} = require('../storage/storage.service');
const env = require('../config/env');

function clientMeta(context = {}) {
  return {
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  };
}

async function assertTaxonomyRefs(payload) {
  const [
    level,
    programme,
    department,
    subject,
    resourceType,
    academicYear,
    semester,
    classNode,
  ] = await Promise.all([
    AcademicLevel.findById(payload.academicLevelId),
    payload.programmeId ? Programme.findById(payload.programmeId) : null,
    payload.departmentId ? Department.findById(payload.departmentId) : null,
    Subject.findById(payload.subjectId),
    ResourceType.findById(payload.resourceTypeId),
    payload.academicYearId ? AcademicYear.findById(payload.academicYearId) : null,
    payload.semesterId ? Semester.findById(payload.semesterId) : null,
    payload.classNodeId ? ClassNode.findById(payload.classNodeId) : null,
  ]);

  if (!level || !level.isEnabled) throw new AppError('Invalid academic level', 400, 'INVALID_TAXONOMY');
  if (!subject || !subject.isEnabled) throw new AppError('Invalid subject', 400, 'INVALID_TAXONOMY');
  if (!resourceType || !resourceType.isEnabled) throw new AppError('Invalid resource type', 400, 'INVALID_TAXONOMY');
  if (payload.academicYearId && (!academicYear || !academicYear.isEnabled)) {
    throw new AppError('Invalid academic year', 400, 'INVALID_TAXONOMY');
  }

  if (!payload.semesterId && !payload.classNodeId) {
    throw new AppError('Either semesterId or classNodeId is required', 400, 'VALIDATION_ERROR');
  }
  if (payload.semesterId && payload.classNodeId) {
    throw new AppError('Provide only one of semesterId or classNodeId', 400, 'VALIDATION_ERROR');
  }
  if (payload.semesterId && (!semester || !semester.isEnabled)) {
    throw new AppError('Invalid semester', 400, 'INVALID_TAXONOMY');
  }
  if (payload.classNodeId && (!classNode || !classNode.isEnabled)) {
    throw new AppError('Invalid class', 400, 'INVALID_TAXONOMY');
  }

  const isSchool = level.kind === 'school_band';
  const isHigherEd = level.kind === 'ug' || level.kind === 'pg';

  if (payload.programmeId) {
    if (!programme || !programme.isEnabled) {
      throw new AppError('Invalid programme', 400, 'INVALID_TAXONOMY');
    }
    if (String(programme.academicLevelId) !== String(payload.academicLevelId)) {
      throw new AppError('Programme does not belong to academic level', 400, 'INVALID_TAXONOMY');
    }
  }

  if (payload.departmentId) {
    if (!department || !department.isEnabled) {
      throw new AppError('Invalid department', 400, 'INVALID_TAXONOMY');
    }
    if (payload.programmeId && String(department.programmeId) !== String(payload.programmeId)) {
      throw new AppError('Department does not belong to programme', 400, 'INVALID_TAXONOMY');
    }
  }

  if (isHigherEd) {
    if (!programme) {
      throw new AppError('Programme/background is required for UG/PG', 400, 'INVALID_TAXONOMY');
    }
    if (!payload.semesterId) {
      throw new AppError('Semester is required for UG/PG', 400, 'VALIDATION_ERROR');
    }
  }

  if (isSchool) {
    if (!payload.classNodeId) {
      throw new AppError('Class is required for school levels', 400, 'VALIDATION_ERROR');
    }
  }
}

async function assertAdminQuota(adminUser, incomingBytes, policy) {
  const quotaBytes = (policy.adminQuotaMb || env.adminStorageQuotaMb) * 1024 * 1024;
  if (adminUser.storageUsedBytes + incomingBytes > quotaBytes) {
    throw new AppError('Admin storage quota exceeded', 403, 'STORAGE_QUOTA_EXCEEDED');
  }
}

async function maybeNotifyDuplicate(adminUser, paper, policy) {
  if (!policy.notificationRules?.duplicateUpload) return;
  await Notification.create({
    type: 'DUPLICATE_UPLOAD',
    severity: 'warning',
    message: `Duplicate PDF detected for "${paper.title}"`,
    audience: 'admin',
    targetUserId: adminUser._id,
    meta: { paperId: paper._id, fileHash: paper.fileHash },
  });
}

async function maybeNotifyLargeUpload(adminUser, paper, policy) {
  const threshold = (policy.largeUploadThresholdMb || 15) * 1024 * 1024;
  if (!policy.notificationRules?.largeUpload || paper.fileSizeBytes < threshold) return;
  await Notification.create({
    type: 'LARGE_UPLOAD',
    severity: 'info',
    message: `Large upload: "${paper.title}" (${Math.round(paper.fileSizeBytes / (1024 * 1024))}MB)`,
    audience: 'admin',
    targetUserId: adminUser._id,
    meta: { paperId: paper._id, fileSizeBytes: paper.fileSizeBytes },
  });
}

async function getDashboard(adminUser) {
  const uploadedBy = adminUser._id;
  const [totals] = await Paper.aggregate([
    { $match: { uploadedBy, isDeleted: false } },
    {
      $group: {
        _id: null,
        uploadCount: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        totalDownloads: { $sum: '$downloadCount' },
        storageUsedBytes: { $sum: '$fileSizeBytes' },
      },
    },
  ]);

  const latest = await Paper.find({ uploadedBy, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title createdAt viewCount downloadCount fileSizeBytes')
    .lean();

  return {
    uploadCount: totals?.uploadCount || 0,
    totalViews: totals?.totalViews || 0,
    totalDownloads: totals?.totalDownloads || 0,
    storageUsedBytes: adminUser.storageUsedBytes || totals?.storageUsedBytes || 0,
    latest,
  };
}

async function listOwnPapers(adminUser, query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, ['createdAt', 'title', 'viewCount', 'downloadCount', 'status'], {
    createdAt: -1,
  });

  // Single-institution: admins manage all institution papers (not college-scoped).
  const filter = {
    isDeleted: query.deleted === 'true',
  };

  if (query.status) {
    filter.status = String(query.status);
  }

  if (query.q) {
    filter.$text = { $search: String(query.q).trim() };
  }

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('departmentId', 'name slug')
      .populate('programmeId', 'name slug')
      .populate('semesterId', 'name slug')
      .populate('classNodeId', 'name slug')
      .populate('subjectId', 'name slug')
      .populate('resourceTypeId', 'name slug')
      .populate('paperTypeId', 'name slug')
      .populate('academicYearId', 'name slug')
      .select('-storage.raw')
      .lean(),
    Paper.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

async function uploadPaper(adminUser, file, body, context = {}) {
  const meta = clientMeta(context);
  await assertTaxonomyRefs(body);

  const policy = await getActiveStoragePolicy();
  await assertAdminQuota(adminUser, file.size, policy);

  let duplicateOf = null;
  let isDuplicateSuspect = false;

  if (policy.duplicateDetection !== false) {
    const hash = computeFileHash(file.buffer);
    const existing = await Paper.findOne({ fileHash: hash, isDeleted: false })
      .select('title originalFileName uploadedBy createdAt status')
      .lean();
    if (existing) {
      const force =
        body.confirmDuplicate === true ||
        body.confirmDuplicate === 'true' ||
        body.forceDuplicate === true ||
        body.forceDuplicate === 'true';

      if (!force) {
        throw new AppError(
          'Similar paper already exists. Confirm to continue with different metadata.',
          409,
          'DUPLICATE_SUSPECT',
          [
            {
              field: 'file',
              msg: 'Similar paper already exists',
              existingPaper: {
                id: existing._id,
                title: existing.title,
                originalFileName: existing.originalFileName,
                status: existing.status,
                createdAt: existing.createdAt,
              },
            },
          ]
        );
      }

      isDuplicateSuspect = true;
      duplicateOf = existing._id;
    }
  }

  const uploaded = await uploadPdf(file);
  const paper = await Paper.create({
    title: body.title,
    description: body.description || '',
    academicLevelId: body.academicLevelId,
    programmeId: body.programmeId || null,
    departmentId: body.departmentId || null,
    semesterId: body.semesterId || null,
    classNodeId: body.classNodeId || null,
    subjectId: body.subjectId,
    resourceTypeId: body.resourceTypeId,
    academicYearId: body.academicYearId || null,
    paperTypeId: body.paperTypeId || null,
    fileName: uploaded.fileName,
    originalFileName: uploaded.originalFileName,
    mimeType: uploaded.mimeType,
    fileSizeBytes: uploaded.fileSizeBytes,
    fileHash: uploaded.fileHash,
    storage: uploaded.storage,
    uploadedBy: adminUser._id,
    isDuplicateSuspect,
    duplicateOf,
    status: body.status || 'draft',
    tags: Array.isArray(body.tags) ? body.tags : [],
  });

  adminUser.storageUsedBytes += uploaded.fileSizeBytes;
  await adminUser.save();

  if (isDuplicateSuspect) {
    await maybeNotifyDuplicate(adminUser, paper, policy);
  }
  await maybeNotifyLargeUpload(adminUser, paper, policy);

  await writeAuditLog({
    action: 'ADMIN_PAPER_UPLOAD',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    after: { title: paper.title, fileName: paper.fileName },
    ...meta,
  });

  return paper;
}

async function bulkUpload(adminUser, files, sharedBody, context = {}) {
  if (!files || !files.length) {
    throw new AppError('At least one PDF file is required', 400, 'VALIDATION_ERROR');
  }

  const results = [];
  for (const file of files) {
    try {
      const title = sharedBody.titlePrefix
        ? `${sharedBody.titlePrefix} - ${file.originalname}`
        : file.originalname.replace(/\.pdf$/i, '');
      const paper = await uploadPaper(
        adminUser,
        file,
        { ...sharedBody, title },
        context
      );
      results.push({ success: true, paperId: paper._id, title: paper.title });
    } catch (error) {
      results.push({
        success: false,
        fileName: file.originalname,
        message: error.message,
        code: error.code || 'UPLOAD_FAILED',
      });
    }
  }

  return { results, uploaded: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length };
}

async function updateMetadata(adminUser, paperId, body, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, uploadedBy: adminUser._id, isDeleted: false });
  if (!paper) throw new AppError('Paper not found', 404, 'NOT_FOUND');

  const next = {
    title: body.title ?? paper.title,
    description: body.description ?? paper.description,
    academicLevelId: body.academicLevelId ?? paper.academicLevelId,
    programmeId: body.programmeId ?? paper.programmeId,
    departmentId: body.departmentId ?? paper.departmentId,
    semesterId: body.semesterId !== undefined ? body.semesterId : paper.semesterId,
    classNodeId: body.classNodeId !== undefined ? body.classNodeId : paper.classNodeId,
    subjectId: body.subjectId ?? paper.subjectId,
    resourceTypeId: body.resourceTypeId ?? paper.resourceTypeId,
    academicYearId: body.academicYearId ?? paper.academicYearId,
    paperTypeId: body.paperTypeId !== undefined ? body.paperTypeId : paper.paperTypeId,
    status: body.status ?? paper.status,
    tags: body.tags ?? paper.tags,
  };

  await assertTaxonomyRefs(next);

  const before = paper.toObject();
  Object.assign(paper, next);
  await paper.save();

  await writeAuditLog({
    action: 'ADMIN_PAPER_UPDATE',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    before: { title: before.title, status: before.status },
    after: { title: paper.title, status: paper.status },
    ...meta,
  });

  return paper;
}

async function replacePaperPdf(adminUser, paperId, file, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, uploadedBy: adminUser._id, isDeleted: false });
  if (!paper) throw new AppError('Paper not found', 404, 'NOT_FOUND');

  const policy = await getActiveStoragePolicy();
  const sizeDelta = file.size - paper.fileSizeBytes;
  if (sizeDelta > 0) {
    await assertAdminQuota(adminUser, sizeDelta, policy);
  }

  const replaced = await replacePdf(paper.storage.providerKey, file, {
    publicId: paper.storage.providerKey,
    overwrite: true,
  });

  const previousSize = paper.fileSizeBytes;
  paper.originalFileName = replaced.originalFileName;
  paper.fileName = replaced.fileName;
  paper.fileSizeBytes = replaced.fileSizeBytes;
  paper.fileHash = replaced.fileHash;
  paper.storage = replaced.storage;

  if (policy.duplicateDetection !== false) {
    const existing = await Paper.findOne({
      fileHash: replaced.fileHash,
      isDeleted: false,
      _id: { $ne: paper._id },
    });
    paper.isDuplicateSuspect = Boolean(existing);
    paper.duplicateOf = existing ? existing._id : null;
  }

  await paper.save();

  adminUser.storageUsedBytes = Math.max(0, adminUser.storageUsedBytes - previousSize + replaced.fileSizeBytes);
  await adminUser.save();

  await writeAuditLog({
    action: 'ADMIN_PAPER_REPLACE_PDF',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    ...meta,
  });

  return paper;
}

async function softDeletePaper(adminUser, paperId, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, isDeleted: false });
  if (!paper) throw new AppError('Paper not found', 404, 'NOT_FOUND');

  paper.isDeleted = true;
  paper.deletedAt = new Date();
  paper.deletedBy = adminUser._id;
  await paper.save();

  await writeAuditLog({
    action: 'ADMIN_PAPER_SOFT_DELETE',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    ...meta,
  });

  return paper;
}

async function listRecycleBin(adminUser, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { isDeleted: true };

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subjectId', 'name')
      .populate('academicYearId', 'name')
      .select('-storage.raw')
      .lean(),
    Paper.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

async function restorePaper(adminUser, paperId, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, isDeleted: true });
  if (!paper) throw new AppError('Paper not found in recycle bin', 404, 'NOT_FOUND');

  paper.isDeleted = false;
  paper.deletedAt = null;
  paper.deletedBy = null;
  await paper.save();

  await writeAuditLog({
    action: 'ADMIN_PAPER_RESTORE',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    ...meta,
  });

  return paper;
}

async function permanentDeletePaper(adminUser, paperId, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, isDeleted: true });
  if (!paper) throw new AppError('Paper not found in recycle bin', 404, 'NOT_FOUND');

  await deleteStoredFile(paper.storage.providerKey);

  // Adjust storage on the original uploader when available
  if (paper.uploadedBy) {
    const User = require('../models/User');
    const owner = await User.findById(paper.uploadedBy);
    if (owner) {
      owner.storageUsedBytes = Math.max(0, (owner.storageUsedBytes || 0) - paper.fileSizeBytes);
      await owner.save();
    }
  }

  await Paper.deleteOne({ _id: paper._id });

  await writeAuditLog({
    action: 'ADMIN_PAPER_PERMANENT_DELETE',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paperId,
    ...meta,
  });

  return { deleted: true, id: paperId };
}

async function uploadHistory(adminUser, query) {
  return listOwnPapers(adminUser, { ...query, deleted: 'false' });
}

async function storageDashboard(adminUser) {
  const policy = await getActiveStoragePolicy();
  const quotaBytes = (policy.adminQuotaMb || env.adminStorageQuotaMb) * 1024 * 1024;

  const [agg] = await Paper.aggregate([
    { $match: { uploadedBy: adminUser._id, isDeleted: false } },
    {
      $group: {
        _id: null,
        filesUploaded: { $sum: 1 },
        totalBytes: { $sum: '$fileSizeBytes' },
        avgBytes: { $avg: '$fileSizeBytes' },
        maxBytes: { $max: '$fileSizeBytes' },
        downloads: { $sum: '$downloadCount' },
        views: { $sum: '$viewCount' },
      },
    },
  ]);

  const largest = await Paper.find({ uploadedBy: adminUser._id, isDeleted: false })
    .sort({ fileSizeBytes: -1 })
    .limit(1)
    .select('title fileSizeBytes originalFileName')
    .lean();

  return {
    myStorageUsedBytes: adminUser.storageUsedBytes || agg?.totalBytes || 0,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - (adminUser.storageUsedBytes || 0)),
    filesUploaded: agg?.filesUploaded || 0,
    averageFileSizeBytes: Math.round(agg?.avgBytes || 0),
    largestFile: largest[0] || null,
    downloads: agg?.downloads || 0,
    views: agg?.views || 0,
    usagePercent: quotaBytes
      ? Math.round(((adminUser.storageUsedBytes || 0) / quotaBytes) * 10000) / 100
      : 0,
  };
}

async function listDuplicates(adminUser, query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {
    uploadedBy: adminUser._id,
    isDeleted: false,
    isDuplicateSuspect: true,
  };

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('duplicateOf', 'title fileName uploadedBy')
      .select('-storage.raw')
      .lean(),
    Paper.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

async function ownAnalytics(adminUser) {
  const dashboard = await getDashboard(adminUser);
  const bySubject = await Paper.aggregate([
    { $match: { uploadedBy: adminUser._id, isDeleted: false } },
    {
      $group: {
        _id: '$subjectId',
        papers: { $sum: 1 },
        downloads: { $sum: '$downloadCount' },
        views: { $sum: '$viewCount' },
      },
    },
    { $sort: { downloads: -1 } },
    { $limit: 10 },
  ]);

  return {
    ...dashboard,
    bySubject,
  };
}

async function publishPaper(adminUser, paperId, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, isDeleted: false })
    .populate('programmeId', 'name')
    .populate('semesterId', 'name')
    .populate('subjectId', 'name')
    .populate('paperTypeId', 'name')
    .populate('academicYearId', 'name');
  if (!paper) throw new AppError('Paper not found', 404, 'NOT_FOUND');

  const before = { status: paper.status };
  paper.status = 'published';
  await paper.save();

  await writeAuditLog({
    action: 'ADMIN_PAPER_PUBLISH',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    before,
    after: { status: paper.status, title: paper.title },
    ...meta,
  });

  return paper;
}

async function unpublishPaper(adminUser, paperId, context = {}) {
  const meta = clientMeta(context);
  const paper = await Paper.findOne({ _id: paperId, isDeleted: false });
  if (!paper) throw new AppError('Paper not found', 404, 'NOT_FOUND');

  paper.status = 'draft';
  await paper.save();

  await writeAuditLog({
    action: 'ADMIN_PAPER_UNPUBLISH',
    actorId: adminUser._id,
    actorRole: adminUser.role,
    actorEmail: adminUser.email,
    entityType: 'Paper',
    entityId: paper._id.toString(),
    after: { status: paper.status, title: paper.title },
    ...meta,
  });

  return paper;
}

module.exports = {
  getDashboard,
  listOwnPapers,
  uploadPaper,
  bulkUpload,
  updateMetadata,
  replacePaperPdf,
  softDeletePaper,
  listRecycleBin,
  restorePaper,
  permanentDeletePaper,
  uploadHistory,
  storageDashboard,
  listDuplicates,
  ownAnalytics,
  publishPaper,
  unpublishPaper,
};
