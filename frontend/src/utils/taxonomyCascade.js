export function idEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

export function itemId(item) {
  if (!item) return '';
  return String(item.id || item._id || '');
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

/** UG/PG and other college-style levels that use programme → department → semester. */
export function usesProgrammeCascade(level) {
  if (!level) return false;
  if (isSchoolBand(level)) return false;
  return level.kind === 'ug' || level.kind === 'pg' || level.kind === 'other' || !level.kind;
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
      (item.kind === 'background' ||
        item.kind === 'degree' ||
        item.kind === 'other' ||
        !item.kind) &&
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
  const list = (taxonomy?.semesters || []).filter((item) => {
    if (departmentId) return idEq(item.departmentId, departmentId);
    if (programmeId) return idEq(item.programmeId, programmeId);
    if (academicLevelId) return idEq(item.academicLevelId, academicLevelId);
    return true;
  });
  return [...list].sort((a, b) => {
    const an = Number(a.number) || 0;
    const bn = Number(b.number) || 0;
    if (an !== bn) return an - bn;
    return String(a.name || '').localeCompare(String(b.name || ''));
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

  const list = (taxonomy?.subjects || []).filter((item) => {
    // Prefer exact semester/class match — those already imply the parent chain.
    if (semesterId) return idEq(item.semesterId, semesterId);
    if (classNodeId) return idEq(item.classNodeId, classNodeId);

    // Without semester/class, narrow by whatever parents are selected.
    if (academicLevelId && item.academicLevelId && !idEq(item.academicLevelId, academicLevelId)) {
      return false;
    }
    if (programmeId && item.programmeId && !idEq(item.programmeId, programmeId)) {
      return false;
    }
    if (departmentId && item.departmentId && !idEq(item.departmentId, departmentId)) {
      return false;
    }
    // Only list subjects once a leaf parent is chosen.
    return false;
  });

  return [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
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

/**
 * Fill missing parent ids from a department / semester / subject id
 * (e.g. Home page links with only departmentId).
 */
export function hydrateBrowseFilters(taxonomy, filters) {
  if (!taxonomy || !filters) return filters;
  const next = { ...filters };

  if (next.subjectId && (!next.semesterId || !next.departmentId)) {
    const subject = (taxonomy.subjects || []).find((item) => idEq(item._id, next.subjectId));
    if (subject) {
      if (!next.semesterId && subject.semesterId) next.semesterId = String(subject.semesterId);
      if (!next.classNodeId && subject.classNodeId) next.classNodeId = String(subject.classNodeId);
      if (!next.departmentId && subject.departmentId) next.departmentId = String(subject.departmentId);
      if (!next.programmeId && subject.programmeId) next.programmeId = String(subject.programmeId);
      if (!next.academicLevelId && subject.academicLevelId) {
        next.academicLevelId = String(subject.academicLevelId);
      }
    }
  }

  if (next.semesterId && (!next.departmentId || !next.programmeId || !next.academicLevelId)) {
    const semester = (taxonomy.semesters || []).find((item) => idEq(item._id, next.semesterId));
    if (semester) {
      if (!next.departmentId && semester.departmentId) next.departmentId = String(semester.departmentId);
      if (!next.programmeId && semester.programmeId) next.programmeId = String(semester.programmeId);
      if (!next.academicLevelId && semester.academicLevelId) {
        next.academicLevelId = String(semester.academicLevelId);
      }
    }
  }

  if (next.departmentId && (!next.programmeId || !next.academicLevelId)) {
    const department = (taxonomy.departments || []).find((item) => idEq(item._id, next.departmentId));
    if (department?.programmeId) {
      if (!next.programmeId) next.programmeId = String(department.programmeId);
      const programme = (taxonomy.programmes || []).find((item) => idEq(item._id, department.programmeId));
      if (programme?.academicLevelId && !next.academicLevelId) {
        next.academicLevelId = String(programme.academicLevelId);
      }
    }
  }

  if (next.classNodeId && !next.academicLevelId) {
    const classNode = (taxonomy.classes || []).find((item) => idEq(item._id, next.classNodeId));
    if (classNode?.academicLevelId) next.academicLevelId = String(classNode.academicLevelId);
    if (classNode?.programmeId && !next.programmeId) next.programmeId = String(classNode.programmeId);
  }

  return next;
}

export function taxonomyOptionLabel(item, { withContext = false, taxonomy } = {}) {
  if (!item) return '';
  const base =
    item.number != null && String(item.name || '').toLowerCase().startsWith('semester')
      ? `Semester ${item.number}`
      : item.name || 'Untitled';

  if (!withContext || !taxonomy) return base;

  const bits = [];
  if (item.departmentId) {
    const dep = (taxonomy.departments || []).find((d) => idEq(d._id, item.departmentId));
    if (dep?.name) bits.push(dep.name);
  }
  if (item.programmeId) {
    const prog = (taxonomy.programmes || []).find((p) => idEq(p._id, item.programmeId));
    if (prog?.name) bits.push(prog.name);
  }
  return bits.length ? `${base} · ${bits.join(' / ')}` : base;
}

export function browseHelperText(level) {
  if (!level) {
    return 'Start with an academic level, then narrow by programme, class, semester, subject, and exam type.';
  }
  if (isSchoolBand(level)) {
    return 'School: academic level → stream (Class 11–12) → class → subject → exam type.';
  }
  if (usesProgrammeCascade(level)) {
    return 'College: academic level → programme → department → semester → subject → exam type.';
  }
  return 'Choose academic level, then follow the filters that appear for that level.';
}

export function schoolUploadRequiresStream(taxonomy, levelId) {
  return hasStreamProgrammes(taxonomy, levelId);
}
