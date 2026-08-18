const AppError = require('../utils/AppError');
const { slugify } = require('../utils/slugify');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { writeAuditLog } = require('./auditLog.service');
const memoryCache = require('../utils/memoryCache');
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
  let name = body.name;
  if (resource === 'semesters' && body.number !== undefined && body.number !== '' && !String(name || '').trim()) {
    name = `Semester ${Number(body.number)}`;
  }

  const payload = {
    name,
    slug: body.slug ? slugify(body.slug) : slugify(name),
    description: body.description || '',
    order: body.order ?? (resource === 'semesters' && body.number ? Number(body.number) : 0),
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
  if (resource === 'semesters' && body.number !== undefined && body.number !== '') {
    payload.number = Number(body.number);
  }
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
  // Taxonomy trees can exceed the default API page size (100).
  const { page, limit, skip } = parsePagination(query, { page: 1, limit: 100, maxLimit: 2000 });
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
    Model.find(filter).sort({ order: 1, number: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

function clearPublicTaxonomyCache() {
  memoryCache.clear();
}

async function applySubjectParentsFromSemester(payload) {
  if (!payload.semesterId) return payload;
  const semester = await Semester.findById(payload.semesterId).lean();
  if (!semester) {
    throw new AppError('Selected semester was not found', 400, 'VALIDATION_ERROR');
  }
  // Semester owns the parent chain — keep subject aligned so upload filters work.
  payload.academicLevelId = semester.academicLevelId || payload.academicLevelId || null;
  payload.programmeId = semester.programmeId || payload.programmeId || null;
  payload.departmentId = semester.departmentId || payload.departmentId || null;
  payload.classNodeId = null;
  return payload;
}

async function applySubjectParentsFromClass(payload) {
  if (!payload.classNodeId) return payload;
  const classNode = await ClassNode.findById(payload.classNodeId).lean();
  if (!classNode) {
    throw new AppError('Selected class was not found', 400, 'VALIDATION_ERROR');
  }
  payload.academicLevelId = classNode.academicLevelId || payload.academicLevelId || null;
  payload.programmeId = classNode.programmeId || payload.programmeId || null;
  payload.departmentId = classNode.departmentId || payload.departmentId || null;
  payload.semesterId = null;
  return payload;
}

async function ensureSemestersForDepartment(department, { academicLevelId, programmeId, count, actorId }) {
  let created = 0;
  let existing = 0;
  const deptSlug = department.slug || slugify(department.name);

  for (let sem = 1; sem <= count; sem += 1) {
    const name = `Semester ${sem}`;
    const slug = slugify(`${academicLevelId}-${programmeId}-${deptSlug}-sem-${sem}`);
    const found = await Semester.findOne({
      departmentId: department._id,
      number: sem,
    });

    if (found) {
      existing += 1;
      // Keep parent chain aligned if older rows drifted.
      await Semester.updateOne(
        { _id: found._id },
        {
          $set: {
            name,
            order: sem,
            isEnabled: true,
            academicLevelId,
            programmeId,
            departmentId: department._id,
            updatedBy: actorId || null,
          },
        }
      );
      continue;
    }

    await Semester.create({
      name,
      slug,
      number: sem,
      order: sem,
      isEnabled: true,
      academicLevelId,
      programmeId,
      departmentId: department._id,
      createdBy: actorId || null,
      updatedBy: actorId || null,
    });
    created += 1;
  }

  return { created, existing, expected: count };
}

async function ensureStandardSemesters(actor, context = {}) {
  const ugLevels = await AcademicLevel.find({ kind: 'ug', isEnabled: true }).lean();
  const pgLevels = await AcademicLevel.find({ kind: 'pg', isEnabled: true }).lean();
  const levelIds = [...ugLevels, ...pgLevels].map((l) => l._id);
  const programmes = await Programme.find({
    academicLevelId: { $in: levelIds },
    isEnabled: true,
  }).lean();
  const programmeById = new Map(programmes.map((p) => [String(p._id), p]));
  const departments = await Department.find({
    programmeId: { $in: programmes.map((p) => p._id) },
    isEnabled: true,
  }).lean();

  const ugLevelIds = new Set(ugLevels.map((l) => String(l._id)));
  const pgLevelIds = new Set(pgLevels.map((l) => String(l._id)));

  let departmentsProcessed = 0;
  let semestersCreated = 0;
  let semestersExisting = 0;
  const details = [];

  for (const department of departments) {
    const programme = programmeById.get(String(department.programmeId));
    if (!programme) continue;
    const levelId = String(programme.academicLevelId);
    const count = ugLevelIds.has(levelId) ? 8 : pgLevelIds.has(levelId) ? 4 : 0;
    if (!count) continue;

    const result = await ensureSemestersForDepartment(department, {
      academicLevelId: programme.academicLevelId,
      programmeId: programme._id,
      count,
      actorId: actor?._id,
    });
    departmentsProcessed += 1;
    semestersCreated += result.created;
    semestersExisting += result.existing;
    if (result.created > 0) {
      details.push({
        departmentId: department._id,
        departmentName: department.name,
        created: result.created,
        expected: result.expected,
      });
    }
  }

  clearPublicTaxonomyCache();

  await writeAuditLog({
    action: 'SUPERADMIN_ENSURE_STANDARD_SEMESTERS',
    actorId: actor?._id,
    actorRole: actor?.role,
    actorEmail: actor?.email,
    entityType: 'Semester',
    meta: { departmentsProcessed, semestersCreated, semestersExisting },
    ...metaFrom(context),
  });

  return {
    departmentsProcessed,
    semestersCreated,
    semestersExisting,
    ugSemestersPerDepartment: 8,
    pgSemestersPerDepartment: 4,
    details,
  };
}

async function createTaxonomy(actor, resource, body, context = {}) {
  const Model = getModel(resource);
  let payload = buildCreatePayload(resource, body, actor._id);

  if (resource === 'semesters') {
    if (!payload.departmentId) {
      throw new AppError('Semester requires a department for UG/PG.', 400, 'VALIDATION_ERROR');
    }
    if (!payload.number) {
      throw new AppError('Semester number is required (1–8 for UG, 1–4 for PG).', 400, 'VALIDATION_ERROR');
    }
    const department = await Department.findById(payload.departmentId).lean();
    if (!department) throw new AppError('Department not found', 400, 'VALIDATION_ERROR');
    const programme = await Programme.findById(department.programmeId).lean();
    if (!programme) throw new AppError('Programme not found for department', 400, 'VALIDATION_ERROR');
    payload.programmeId = programme._id;
    payload.academicLevelId = programme.academicLevelId;
    const level = await AcademicLevel.findById(programme.academicLevelId).lean();
    const maxSem = level?.kind === 'pg' ? 4 : level?.kind === 'ug' ? 8 : 12;
    if (payload.number < 1 || payload.number > maxSem) {
      throw new AppError(
        `Semester number must be between 1 and ${maxSem} for this academic level.`,
        400,
        'VALIDATION_ERROR'
      );
    }
    const exists = await Semester.findOne({ departmentId: payload.departmentId, number: payload.number });
    if (exists) {
      throw new AppError(
        `Semester ${payload.number} already exists for this department.`,
        409,
        'TAXONOMY_DUPLICATE'
      );
    }
  }

  if (resource === 'subjects') {
    if (payload.semesterId && payload.classNodeId) {
      throw new AppError(
        'Subject must use either a semester (UG/PG) or a class (school), not both.',
        400,
        'VALIDATION_ERROR'
      );
    }
    if (!payload.semesterId && !payload.classNodeId) {
      throw new AppError(
        'Subject requires a semester (for UG/PG) or a class (for school).',
        400,
        'VALIDATION_ERROR'
      );
    }
    if (payload.semesterId) payload = await applySubjectParentsFromSemester(payload);
    if (payload.classNodeId) payload = await applySubjectParentsFromClass(payload);
  }

  const doc = await Model.create(payload);
  clearPublicTaxonomyCache();

  if (resource === 'departments') {
    const programme = await Programme.findById(doc.programmeId).lean();
    const level = programme
      ? await AcademicLevel.findById(programme.academicLevelId).lean()
      : null;
    const count = level?.kind === 'ug' ? 8 : level?.kind === 'pg' ? 4 : 0;
    if (count) {
      await ensureSemestersForDepartment(doc, {
        academicLevelId: programme.academicLevelId,
        programmeId: programme._id,
        count,
        actorId: actor._id,
      });
      clearPublicTaxonomyCache();
    }
  }

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

  if (resource === 'subjects' && doc.semesterId) {
    const semester = await Semester.findById(doc.semesterId).lean();
    if (semester) {
      doc.academicLevelId = semester.academicLevelId || null;
      doc.programmeId = semester.programmeId || null;
      doc.departmentId = semester.departmentId || null;
      doc.classNodeId = null;
    }
  }
  if (resource === 'subjects' && doc.classNodeId) {
    const classNode = await ClassNode.findById(doc.classNodeId).lean();
    if (classNode) {
      doc.academicLevelId = classNode.academicLevelId || null;
      doc.programmeId = classNode.programmeId || null;
      doc.departmentId = classNode.departmentId || null;
      doc.semesterId = null;
    }
  }

  await doc.save();
  clearPublicTaxonomyCache();

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
  clearPublicTaxonomyCache();

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
  ensureStandardSemesters,
  MODEL_MAP,
};
