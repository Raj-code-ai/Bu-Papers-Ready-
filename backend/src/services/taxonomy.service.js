const AppError = require('../utils/AppError');
const { slugify } = require('../utils/slugify');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { writeAuditLog } = require('./auditLog.service');
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
} = require('../models');

const MODEL_MAP = {
  levels: AcademicLevel,
  programmes: Programme,
  departments: Department,
  semesters: Semester,
  classes: ClassNode,
  subjects: Subject,
  'resource-types': ResourceType,
  'paper-types': PaperType,
};

const PAPER_REF_FIELDS = {
  levels: 'academicLevelId',
  programmes: 'programmeId',
  departments: 'departmentId',
  semesters: 'semesterId',
  classes: 'classNodeId',
  subjects: 'subjectId',
  'resource-types': 'resourceTypeId',
  'paper-types': 'paperTypeId',
};

function getModel(resource) {
  const model = MODEL_MAP[resource];
  if (!model) throw new AppError(`Unknown taxonomy resource: ${resource}`, 404, 'NOT_FOUND');
  return model;
}

function metaFrom(context = {}) {
  return {
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  };
}

function buildCreatePayload(resource, body, actorId) {
  const payload = {
    name: body.name,
    slug: body.slug ? slugify(body.slug) : slugify(body.name),
    description: body.description || '',
    order: body.order ?? 0,
    isEnabled: body.isEnabled !== undefined ? Boolean(body.isEnabled) : true,
    metadata: body.metadata || {},
    createdBy: actorId,
    updatedBy: actorId,
  };

  if (resource === 'levels' && body.kind !== undefined) payload.kind = body.kind;
  if (resource === 'programmes') {
    payload.academicLevelId = body.academicLevelId;
    payload.parentProgrammeId = body.parentProgrammeId || null;
    if (body.kind !== undefined) payload.kind = body.kind;
  }
  if (resource === 'departments') payload.programmeId = body.programmeId;
  if (resource === 'semesters' || resource === 'classes') {
    payload.academicLevelId = body.academicLevelId || null;
    payload.programmeId = body.programmeId || null;
    payload.departmentId = body.departmentId || null;
  }
  if (resource === 'semesters' && body.number !== undefined) payload.number = body.number;
  if (resource === 'subjects') {
    payload.academicLevelId = body.academicLevelId || null;
    payload.programmeId = body.programmeId || null;
    payload.departmentId = body.departmentId || null;
    payload.semesterId = body.semesterId || null;
    payload.classNodeId = body.classNodeId || null;
    payload.code = body.code || '';
  }
  if (resource === 'resource-types') payload.featureKey = body.featureKey || null;

  return payload;
}

async function listTaxonomy(resource, query) {
  const Model = getModel(resource);
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.isEnabled !== undefined) filter.isEnabled = query.isEnabled === 'true';
  if (query.academicLevelId) filter.academicLevelId = query.academicLevelId;
  if (query.programmeId) filter.programmeId = query.programmeId;
  if (query.parentProgrammeId) filter.parentProgrammeId = query.parentProgrammeId;
  if (query.departmentId) filter.departmentId = query.departmentId;
  if (query.semesterId) filter.semesterId = query.semesterId;
  if (query.classNodeId) filter.classNodeId = query.classNodeId;
  if (query.kind) filter.kind = query.kind;
  if (query.q) filter.name = new RegExp(String(query.q), 'i');

  const [items, total] = await Promise.all([
    Model.find(filter).sort({ order: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

async function createTaxonomy(actor, resource, body, context = {}) {
  const Model = getModel(resource);
  const payload = buildCreatePayload(resource, body, actor._id);
  const doc = await Model.create(payload);

  await writeAuditLog({
    action: `SUPERADMIN_CREATE_${resource.toUpperCase()}`,
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: Model.modelName,
    entityId: doc._id.toString(),
    after: payload,
    ...metaFrom(context),
  });

  return doc;
}

async function updateTaxonomy(actor, resource, id, body, context = {}) {
  const Model = getModel(resource);
  const doc = await Model.findById(id);
  if (!doc) throw new AppError('Record not found', 404, 'NOT_FOUND');

  const before = doc.toObject();
  if (body.name !== undefined) {
    doc.name = body.name;
    if (!body.slug) doc.slug = slugify(body.name);
  }
  if (body.slug) doc.slug = slugify(body.slug);
  if (body.description !== undefined) doc.description = body.description;
  if (body.order !== undefined) doc.order = body.order;
  if (body.isEnabled !== undefined) doc.isEnabled = Boolean(body.isEnabled);
  if (body.metadata !== undefined) doc.metadata = body.metadata;
  if (body.kind !== undefined) doc.kind = body.kind;
  if (body.featureKey !== undefined) doc.featureKey = body.featureKey;
  if (body.code !== undefined) doc.code = body.code;
  if (body.number !== undefined) doc.number = body.number;
  if (body.startYear !== undefined) doc.startYear = body.startYear;
  if (body.endYear !== undefined) doc.endYear = body.endYear;
  if (body.isCurrent !== undefined) doc.isCurrent = Boolean(body.isCurrent);
  if (body.academicLevelId !== undefined) doc.academicLevelId = body.academicLevelId || null;
  if (body.programmeId !== undefined) doc.programmeId = body.programmeId || null;
  if (body.parentProgrammeId !== undefined) doc.parentProgrammeId = body.parentProgrammeId || null;
  if (body.departmentId !== undefined) doc.departmentId = body.departmentId || null;
  if (body.semesterId !== undefined) doc.semesterId = body.semesterId || null;
  if (body.classNodeId !== undefined) doc.classNodeId = body.classNodeId || null;
  doc.updatedBy = actor._id;

  await doc.save();

  await writeAuditLog({
    action: `SUPERADMIN_UPDATE_${resource.toUpperCase()}`,
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: Model.modelName,
    entityId: doc._id.toString(),
    before,
    after: doc.toObject(),
    ...metaFrom(context),
  });

  return doc;
}

async function deleteTaxonomy(actor, resource, id, context = {}) {
  const Model = getModel(resource);
  const doc = await Model.findById(id);
  if (!doc) throw new AppError('Record not found', 404, 'NOT_FOUND');

  const paperField = PAPER_REF_FIELDS[resource];
  if (paperField) {
    const paperCount = await Paper.countDocuments({ [paperField]: id, isDeleted: false });
    if (paperCount > 0) {
      throw new AppError(
        `Cannot delete: ${paperCount} paper(s) still reference this item. Disable it instead.`,
        409,
        'TAXONOMY_IN_USE'
      );
    }
  }

  // Soft-safe: disable children rather than cascade-delete
  if (resource === 'levels') {
    const childProgrammes = await Programme.countDocuments({ academicLevelId: id });
    if (childProgrammes > 0) {
      throw new AppError(
        'Cannot delete level with programmes. Disable the level or remove children first.',
        409,
        'TAXONOMY_HAS_CHILDREN'
      );
    }
  }

  await Model.deleteOne({ _id: id });

  await writeAuditLog({
    action: `SUPERADMIN_DELETE_${resource.toUpperCase()}`,
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: Model.modelName,
    entityId: id,
    before: { name: doc.name, slug: doc.slug },
    ...metaFrom(context),
  });

  return { deleted: true, id };
}

async function reorderTaxonomy(actor, resource, orderedIds, context = {}) {
  const Model = getModel(resource);
  if (!Array.isArray(orderedIds) || !orderedIds.length) {
    throw new AppError('orderedIds array is required', 400, 'VALIDATION_ERROR');
  }

  const ops = orderedIds.map((id, index) =>
    Model.updateOne({ _id: id }, { $set: { order: index + 1, updatedBy: actor._id } })
  );
  await Promise.all(ops);

  await writeAuditLog({
    action: `SUPERADMIN_REORDER_${resource.toUpperCase()}`,
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: Model.modelName,
    meta: { orderedIds },
    ...metaFrom(context),
  });

  return { reordered: true, count: orderedIds.length };
}

async function getTaxonomyTree() {
  const [levels, programmes, departments, semesters, classes, subjects] = await Promise.all([
    AcademicLevel.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Programme.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Department.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Semester.find({ isEnabled: true }).sort({ order: 1, number: 1 }).lean(),
    ClassNode.find({ isEnabled: true }).sort({ order: 1 }).lean(),
    Subject.find({ isEnabled: true }).sort({ order: 1 }).lean(),
  ]);

  return { levels, programmes, departments, semesters, classes, subjects };
}

module.exports = {
  listTaxonomy,
  createTaxonomy,
  updateTaxonomy,
  deleteTaxonomy,
  reorderTaxonomy,
  getTaxonomyTree,
  MODEL_MAP,
};
