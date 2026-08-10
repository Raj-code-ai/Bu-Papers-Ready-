const { slugify } = require('../utils/slugify');
const {
  AcademicLevel,
  Programme,
  Department,
  Semester,
  ClassNode,
  Subject,
  ResourceType,
  PaperType,
  StoragePolicy,
  SecurityPolicy,
  FeatureToggle,
  SystemConfig,
  WebsiteSettings,
  EmailSettings,
} = require('../models');
const env = require('../config/env');
const logger = require('../config/logger');

const DEFAULT_RESOURCE_TYPES = [
  { name: 'Previous Year Papers', featureKey: null, order: 1 },
  { name: 'Notes', featureKey: 'notes', order: 2 },
  { name: 'Assignments', featureKey: 'assignments', order: 3 },
  { name: 'Projects', featureKey: 'projects', order: 4 },
  { name: 'Lab Manuals', featureKey: 'lab_manuals', order: 5 },
  { name: 'Practical Files', featureKey: null, order: 6 },
  { name: 'Syllabus', featureKey: null, order: 7 },
  { name: 'Model Papers', featureKey: 'model_papers', order: 8 },
  { name: 'Presentations', featureKey: null, order: 9 },
];

const DEFAULT_FEATURE_TOGGLES = [
  { key: 'notes', name: 'Notes', enabled: env.featureDefaults.notes },
  { key: 'assignments', name: 'Assignments', enabled: env.featureDefaults.assignments },
  { key: 'projects', name: 'Projects', enabled: env.featureDefaults.projects },
  { key: 'lab_manuals', name: 'Lab Manuals', enabled: env.featureDefaults.labManuals },
  { key: 'model_papers', name: 'Model Papers', enabled: env.featureDefaults.modelPapers },
  { key: 'results', name: 'Results', enabled: env.featureDefaults.results },
  { key: 'announcements', name: 'Announcements', enabled: env.featureDefaults.announcements },
];

const SCHOOL_BANDS = [
  { name: 'Class 1–5', slug: 'class-1-5', order: 1, classes: [1, 2, 3, 4, 5] },
  { name: 'Class 6–10', slug: 'class-6-10', order: 2, classes: [6, 7, 8, 9, 10] },
  { name: 'Class 11–12', slug: 'class-11-12', order: 3, classes: [11, 12], streams: true },
];

const CLASS_11_12_STREAMS = ['Science', 'Commerce', 'Arts / Humanities'];

const UG_BACKGROUNDS = [
  {
    name: 'Engineering',
    slug: 'engineering',
    departments: ['Computer Science & Engineering (CSE)'],
  },
  {
    name: 'Arts',
    slug: 'arts',
    departments: ['English', 'History', 'Political Science', 'Sociology', 'Economics (BA)'],
  },
  {
    name: 'Science',
    slug: 'science',
    departments: ['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology'],
  },
  {
    name: 'Commerce',
    slug: 'commerce',
    departments: ['Accountancy', 'Business Studies', 'Economics (BCom)'],
  },
  {
    name: 'Management',
    slug: 'management',
    departments: ['BBA', 'HR Management', 'Marketing'],
  },
];

const PG_BACKGROUNDS = [
  {
    name: 'Engineering',
    slug: 'pg-engineering',
    departments: ['Computer Science & Engineering (CSE)'],
  },
  {
    name: 'Arts',
    slug: 'pg-arts',
    departments: ['English', 'History', 'Political Science'],
  },
  {
    name: 'Science',
    slug: 'pg-science',
    departments: ['Physics', 'Chemistry', 'Mathematics'],
  },
  {
    name: 'Commerce',
    slug: 'pg-commerce',
    departments: ['Accountancy', 'Finance'],
  },
  {
    name: 'Management',
    slug: 'pg-management',
    departments: ['MBA', 'HR Management'],
  },
];

const OTHER_LEVELS = [
  { name: 'Diploma', slug: 'diploma', kind: 'other', order: 6 },
  { name: 'Certificate', slug: 'certificate', kind: 'other', order: 7 },
  { name: 'Competitive Exams', slug: 'competitive-exams', kind: 'other', order: 8 },
];

async function upsertLevel({ name, slug, kind, order, description }) {
  await AcademicLevel.updateOne(
    { slug },
    {
      $set: {
        name,
        kind,
        order,
        description: description || `${name} academic level`,
        isEnabled: true,
      },
      $setOnInsert: { slug },
    },
    { upsert: true }
  );
  return AcademicLevel.findOne({ slug });
}

async function upsertProgramme({ academicLevelId, name, slug, kind, order, parentProgrammeId = null }) {
  await Programme.updateOne(
    { academicLevelId, slug },
    {
      $set: {
        name,
        kind,
        order,
        parentProgrammeId,
        isEnabled: true,
        academicLevelId,
      },
      $setOnInsert: { slug },
    },
    { upsert: true }
  );
  return Programme.findOne({ academicLevelId, slug });
}

async function upsertDepartment({ programmeId, name, slug, order }) {
  await Department.updateOne(
    { programmeId, slug },
    {
      $set: { name, order, isEnabled: true, programmeId },
      $setOnInsert: { slug },
    },
    { upsert: true }
  );
  return Department.findOne({ programmeId, slug });
}

async function upsertClass({ academicLevelId, programmeId, name, slug, order }) {
  await ClassNode.updateOne(
    { slug, academicLevelId },
    {
      $set: {
        name,
        order,
        isEnabled: true,
        academicLevelId,
        programmeId: programmeId || null,
        departmentId: null,
      },
      $setOnInsert: { slug },
    },
    { upsert: true }
  );
  return ClassNode.findOne({ slug, academicLevelId });
}

async function upsertSemester({ academicLevelId, programmeId, departmentId, name, slug, number, order }) {
  await Semester.updateOne(
    { slug, academicLevelId },
    {
      $set: {
        name,
        number,
        order,
        isEnabled: true,
        academicLevelId,
        programmeId: programmeId || null,
        departmentId: departmentId || null,
      },
      $setOnInsert: { slug },
    },
    { upsert: true }
  );
  return Semester.findOne({ slug, academicLevelId });
}

async function upsertSubject(payload) {
  const { slug, ...rest } = payload;
  const filter = payload.classNodeId
    ? { slug, classNodeId: payload.classNodeId }
    : { slug, semesterId: payload.semesterId };
  await Subject.updateOne(
    filter,
    {
      $set: {
        ...rest,
        isEnabled: true,
      },
      $setOnInsert: { slug },
    },
    { upsert: true }
  );
}

/**
 * Disable legacy flat Class 1–12 AcademicLevel rows (replaced by bands + ClassNodes).
 * Does not delete; papers may still reference old levels until migration remaps them.
 */
async function disableLegacyClassLevels() {
  for (let i = 1; i <= 12; i += 1) {
    await AcademicLevel.updateOne(
      { slug: slugify(`Class ${i}`) },
      { $set: { isEnabled: false, metadata: { legacy: true, replacedByBand: true } } }
    );
  }
  await AcademicLevel.updateOne(
    { slug: 'undergraduate' },
    { $set: { isEnabled: false, metadata: { legacy: true, replacedBy: 'undergraduate' } } }
  );
  await AcademicLevel.updateOne(
    { slug: 'postgraduate' },
    { $set: { isEnabled: false, metadata: { legacy: true, replacedBy: 'postgraduate' } } }
  );
}

async function seedAcademicStructure() {
  // School bands + classes
  for (const band of SCHOOL_BANDS) {
    const level = await upsertLevel({
      name: band.name,
      slug: band.slug,
      kind: 'school_band',
      order: band.order,
    });

    let streams = [];
    if (band.streams) {
      for (const [index, streamName] of CLASS_11_12_STREAMS.entries()) {
        const stream = await upsertProgramme({
          academicLevelId: level._id,
          name: streamName,
          slug: slugify(streamName),
          kind: 'stream',
          order: index + 1,
        });
        streams.push(stream);
      }
    }

    for (const classNum of band.classes) {
      if (band.streams && streams.length) {
        for (const stream of streams) {
          await upsertClass({
            academicLevelId: level._id,
            programmeId: stream._id,
            name: `Class ${classNum}`,
            slug: slugify(`class-${classNum}-${stream.slug}`),
            order: classNum,
          });
        }
      } else {
        await upsertClass({
          academicLevelId: level._id,
          programmeId: null,
          name: `Class ${classNum}`,
          slug: slugify(`class-${classNum}`),
          order: classNum,
        });
      }
    }

    // Sample school subjects for Class 1–10 (no department)
    if (!band.streams) {
      const classes = await ClassNode.find({ academicLevelId: level._id, isEnabled: true });
      const schoolSubjects = ['English', 'Mathematics', 'Science', 'Social Studies'];
      for (const classNode of classes) {
        for (const [index, subjectName] of schoolSubjects.entries()) {
          await upsertSubject({
            name: subjectName,
            slug: slugify(`${subjectName}-${classNode.slug}`),
            academicLevelId: level._id,
            programmeId: null,
            departmentId: null,
            classNodeId: classNode._id,
            semesterId: null,
            code: '',
            order: index + 1,
          });
        }
      }
    }
  }

  // Undergraduate
  const ug = await upsertLevel({
    name: 'Undergraduate',
    slug: 'ug',
    kind: 'ug',
    order: 4,
  });

  for (const [bgIndex, bg] of UG_BACKGROUNDS.entries()) {
    const background = await upsertProgramme({
      academicLevelId: ug._id,
      name: bg.name,
      slug: bg.slug,
      kind: 'background',
      order: bgIndex + 1,
    });

    for (const [deptIndex, deptName] of bg.departments.entries()) {
      const dept = await upsertDepartment({
        programmeId: background._id,
        name: deptName,
        slug: slugify(deptName),
        order: deptIndex + 1,
      });

      for (let sem = 1; sem <= 8; sem += 1) {
        await upsertSemester({
          academicLevelId: ug._id,
          programmeId: background._id,
          departmentId: dept._id,
          name: `Semester ${sem}`,
          slug: slugify(`ug-${bg.slug}-${dept.slug}-sem-${sem}`),
          number: sem,
          order: sem,
        });
      }

      // Sample subjects on semester 1
      const sem1 = await Semester.findOne({
        academicLevelId: ug._id,
        departmentId: dept._id,
        number: 1,
      });
      if (sem1) {
        await upsertSubject({
          name: `${deptName} Core I`,
          slug: slugify(`${dept.slug}-core-1`),
          academicLevelId: ug._id,
          programmeId: background._id,
          departmentId: dept._id,
          semesterId: sem1._id,
          classNodeId: null,
          code: 'CORE101',
          order: 1,
        });
      }
    }
  }

  // Postgraduate
  const pg = await upsertLevel({
    name: 'Postgraduate',
    slug: 'pg',
    kind: 'pg',
    order: 5,
  });

  for (const [bgIndex, bg] of PG_BACKGROUNDS.entries()) {
    const background = await upsertProgramme({
      academicLevelId: pg._id,
      name: bg.name,
      slug: bg.slug,
      kind: 'background',
      order: bgIndex + 1,
    });

    for (const [deptIndex, deptName] of bg.departments.entries()) {
      const dept = await upsertDepartment({
        programmeId: background._id,
        name: deptName,
        slug: slugify(`pg-${deptName}`),
        order: deptIndex + 1,
      });

      for (let sem = 1; sem <= 4; sem += 1) {
        await upsertSemester({
          academicLevelId: pg._id,
          programmeId: background._id,
          departmentId: dept._id,
          name: `Semester ${sem}`,
          slug: slugify(`pg-${bg.slug}-${dept.slug}-sem-${sem}`),
          number: sem,
          order: sem,
        });
      }

      const sem1 = await Semester.findOne({
        academicLevelId: pg._id,
        departmentId: dept._id,
        number: 1,
      });
      if (sem1) {
        await upsertSubject({
          name: `${deptName} Advanced I`,
          slug: slugify(`pg-${dept.slug}-adv-1`),
          academicLevelId: pg._id,
          programmeId: background._id,
          departmentId: dept._id,
          semesterId: sem1._id,
          classNodeId: null,
          code: 'ADV501',
          order: 1,
        });
      }
    }
  }

  for (const level of OTHER_LEVELS) {
    await upsertLevel(level);
  }

  await disableLegacyClassLevels();
}

async function seedResourceTypes() {
  for (const item of DEFAULT_RESOURCE_TYPES) {
    const slug = slugify(item.name);
    await ResourceType.updateOne(
      { slug },
      {
        $setOnInsert: {
          name: item.name,
          slug,
          featureKey: item.featureKey,
          order: item.order,
          isEnabled: true,
        },
      },
      { upsert: true }
    );
  }
}

async function seedPaperTypes() {
  const defaults = ['Mid Term', 'End Term', 'Supplementary', 'Internal Assessment'];
  for (const [index, name] of defaults.entries()) {
    const slug = slugify(name);
    await PaperType.updateOne(
      { slug },
      {
        $setOnInsert: {
          name,
          slug,
          order: index + 1,
          isEnabled: true,
        },
      },
      { upsert: true }
    );
  }
}

async function seedPoliciesAndSettings() {
  await StoragePolicy.updateOne(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        maxFileSizeMb: env.maxFileSizeMb,
        adminQuotaMb: env.adminStorageQuotaMb,
        duplicateDetection: env.duplicateDetectionEnabled,
        recycleBinRetentionDays: env.recycleBinRetentionDays,
        monthlyBudgetUsd: env.monthlyStorageBudgetUsd,
        warningPercent: env.storageWarningPercent,
        criticalPercent: env.storageCriticalPercent,
        autoCleanup: env.autoCleanupEnabled,
        cloudProvider: env.storageProvider,
      },
    },
    { upsert: true }
  );

  await SecurityPolicy.updateOne(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        sessionTimeoutMinutes: env.sessionTimeoutMinutes,
        accountLockMaxAttempts: env.accountLockMaxAttempts,
        accountLockDurationMinutes: env.accountLockDurationMinutes,
        passwordResetTokenExpiresMinutes: env.passwordResetTokenExpiresMinutes,
        superAdmin2faRequired: env.superAdmin2faEnabled,
      },
    },
    { upsert: true }
  );

  await SystemConfig.updateOne(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        maintenanceMode: env.maintenanceMode,
        maintenanceMessage: env.maintenanceMessage,
        backupEnabled: env.backupEnabled,
        backupCronDaily: env.backupCronDaily,
        backupCronWeekly: env.backupCronWeekly,
        backupCronMonthly: env.backupCronMonthly,
        backupRetentionDays: env.backupRetentionDays,
        appName: env.appName,
      },
    },
    { upsert: true }
  );

  await WebsiteSettings.updateOne(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true }
  );

  await EmailSettings.updateOne(
    { key: 'default' },
    {
      $setOnInsert: {
        key: 'default',
        enabled: env.emailEnabled,
        provider: env.emailProvider,
        smtpHost: env.smtp.host,
        smtpPort: env.smtp.port,
        smtpSecure: env.smtp.secure,
        smtpUser: env.smtp.user,
        smtpPass: env.smtp.pass,
        emailFrom: env.emailFrom,
      },
    },
    { upsert: true }
  );

  for (const toggle of DEFAULT_FEATURE_TOGGLES) {
    await FeatureToggle.updateOne(
      { key: toggle.key },
      {
        $setOnInsert: {
          key: toggle.key,
          name: toggle.name,
          enabled: toggle.enabled,
          description: `${toggle.name} feature toggle`,
        },
      },
      { upsert: true }
    );
  }
}

/**
 * Seeds editable defaults only. Super Admin can change/disable everything.
 */
async function seedDatabaseDefaults() {
  await seedAcademicStructure();
  await seedResourceTypes();
  await seedPaperTypes();
  await seedPoliciesAndSettings();
  logger.info('Database defaults seeded (editable by Super Admin)');
}

module.exports = {
  seedDatabaseDefaults,
  seedAcademicStructure,
  DEFAULT_RESOURCE_TYPES,
  SCHOOL_BANDS,
  UG_BACKGROUNDS,
  PG_BACKGROUNDS,
};
