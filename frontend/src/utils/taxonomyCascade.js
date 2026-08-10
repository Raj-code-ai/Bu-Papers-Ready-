export function idEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function getAcademicLevel(taxonomy, levelId) {
  if (!levelId) return null;
  return (taxonomy?.academicLevels || []).find((level) => idEq(level._id, levelId)) || null;
}

export function isSchoolBand(level) {
  return level?.kind === 'school_band';
}

export function isHigherEd(level) {
  return level?.kind === 'ug' || level?.kind === 'pg';
}

export function programmesForLevel(taxonomy, levelId) {
  return (taxonomy?.programmes || []).filter((item) => idEq(item.academicLevelId, levelId));
}

export function streamProgrammes(taxonomy, levelId) {
  return programmesForLevel(taxonomy, levelId).filter((item) => item.kind === 'stream');
}

export function backgroundProgrammes(taxonomy, levelId) {
  return programmesForLevel(taxonomy, levelId).filter(
    (item) =>
      (item.kind === 'background' || item.kind === 'degree' || item.kind === 'other') &&
      !item.parentProgrammeId
  );
}

export function hasStreamProgrammes(taxonomy, levelId) {
  return streamProgrammes(taxonomy, levelId).length > 0;
}

export function departmentsForProgramme(taxonomy, programmeId) {
  return (taxonomy?.departments || []).filter((item) => idEq(item.programmeId, programmeId));
}

export function semestersFor(taxonomy, { academicLevelId, programmeId, departmentId }) {
  return (taxonomy?.semesters || []).filter((item) => {
    if (departmentId) return idEq(item.departmentId, departmentId);
    if (programmeId) return idEq(item.programmeId, programmeId);
    if (academicLevelId) return idEq(item.academicLevelId, academicLevelId);
    return true;
  });
}

export function classesFor(taxonomy, { academicLevelId, programmeId }) {
  if (!academicLevelId) return [];

  const streamsExist = hasStreamProgrammes(taxonomy, academicLevelId);
  if (streamsExist && !programmeId) return [];

  return (taxonomy?.classes || []).filter((item) => {
    if (!idEq(item.academicLevelId, academicLevelId)) return false;
    if (streamsExist) return idEq(item.programmeId, programmeId);
    return !item.programmeId;
  });
}

export function subjectsFor(taxonomy, ctx) {
  const { academicLevelId, programmeId, departmentId, semesterId, classNodeId } = ctx;

  return (taxonomy?.subjects || []).filter((item) => {
    if (academicLevelId && item.academicLevelId && !idEq(item.academicLevelId, academicLevelId)) {
      return false;
    }
    if (programmeId && item.programmeId && !idEq(item.programmeId, programmeId)) {
      return false;
    }
    if (departmentId && item.departmentId && !idEq(item.departmentId, departmentId)) {
      return false;
    }
    if (semesterId) return idEq(item.semesterId, semesterId);
    if (classNodeId) return idEq(item.classNodeId, classNodeId);
    return false;
  });
}

/** Keys cleared when a parent taxonomy field changes. */
export const CASCADE_CHILDREN = {
  academicLevelId: ['programmeId', 'departmentId', 'semesterId', 'classNodeId', 'subjectId'],
  programmeId: ['departmentId', 'semesterId', 'classNodeId', 'subjectId'],
  departmentId: ['semesterId', 'subjectId'],
  semesterId: ['subjectId'],
  classNodeId: ['subjectId'],
};

export function applyCascadeReset(values, key, value) {
  const next = { ...values, [key]: value };
  for (const childKey of CASCADE_CHILDREN[key] || []) {
    next[childKey] = '';
  }
  return next;
}

export function browseHelperText(level) {
  if (!level) {
    return 'Start with an academic level, then narrow by programme, class, semester, subject, and exam type.';
  }
  if (isSchoolBand(level)) {
    return 'School: academic level → stream (Class 11–12) → class → subject → exam type.';
  }
  if (isHigherEd(level)) {
    return 'UG/PG: academic level → programme → department → semester → subject → exam type.';
  }
  return 'Choose academic level, then follow the filters that appear for that level.';
}

export function schoolUploadRequiresStream(taxonomy, levelId) {
  return hasStreamProgrammes(taxonomy, levelId);
}
