import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';
import {
  applyCascadeReset,
  backgroundProgrammes,
  browseHelperText,
  classesFor,
  departmentsForProgramme,
  getAcademicLevel,
  hasStreamProgrammes,
  hydrateBrowseFilters,
  isSchoolBand,
  itemId,
  semestersFor,
  streamProgrammes,
  subjectsFor,
  taxonomyOptionLabel,
  usesProgrammeCascade,
} from '../../utils/taxonomyCascade';
import {
  readPapersCache,
  readTaxonomyCache,
  writePapersCache,
  writeTaxonomyCache,
} from '../../utils/publicCache';

const initialFilters = {
  q: '',
  academicLevelId: '',
  programmeId: '',
  departmentId: '',
  semesterId: '',
  classNodeId: '',
  subjectId: '',
  paperTypeId: '',
  resourceTypeId: '',
  page: 1,
};

function FilterSelect({ label, value, onChange, options, placeholder, taxonomy, withContext }) {
  return (
    <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{placeholder || `All ${label.toLowerCase()}s`}</option>
      {(options || []).map((item) => {
        const id = itemId(item);
        return (
          <option key={id} value={id}>
            {taxonomyOptionLabel(item, { withContext, taxonomy })}
          </option>
        );
      })}
    </select>
  );
}

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    academicLevelId: searchParams.get('academicLevelId') || '',
    programmeId: searchParams.get('programmeId') || '',
    departmentId: searchParams.get('departmentId') || '',
    semesterId: searchParams.get('semesterId') || '',
    classNodeId: searchParams.get('classNodeId') || '',
    subjectId: searchParams.get('subjectId') || '',
    paperTypeId: searchParams.get('paperTypeId') || '',
    resourceTypeId: searchParams.get('resourceTypeId') || '',
    q: searchParams.get('q') || '',
  }));
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get('q') || '');
  const [taxonomy, setTaxonomy] = useState(() => readTaxonomyCache());
  const [papers, setPapers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const selectedLevel = useMemo(
    () => getAcademicLevel(taxonomy, filters.academicLevelId),
    [taxonomy, filters.academicLevelId]
  );

  const cascadeOptions = useMemo(() => {
    const levelId = filters.academicLevelId;
    if (!taxonomy || !levelId) {
      return {
        streams: [],
        programmes: [],
        departments: [],
        semesters: [],
        classes: [],
        subjects: [],
      };
    }

    return {
      streams: streamProgrammes(taxonomy, levelId),
      programmes: backgroundProgrammes(taxonomy, levelId),
      departments: filters.programmeId
        ? departmentsForProgramme(taxonomy, filters.programmeId)
        : [],
      semesters: semestersFor(taxonomy, {
        academicLevelId: levelId,
        programmeId: filters.programmeId,
        departmentId: filters.departmentId,
      }),
      classes: classesFor(taxonomy, {
        academicLevelId: levelId,
        programmeId: filters.programmeId,
      }),
      subjects: subjectsFor(taxonomy, {
        academicLevelId: levelId,
        programmeId: filters.programmeId,
        departmentId: filters.departmentId,
        semesterId: filters.semesterId,
        classNodeId: filters.classNodeId,
      }),
    };
  }, [taxonomy, filters]);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .taxonomy()
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        setTaxonomy(data);
        writeTaxonomyCache(data);
        setFilters((current) => hydrateBrowseFilters(data, current));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!taxonomy) return;
    setFilters((current) => {
      const hydrated = hydrateBrowseFilters(taxonomy, current);
      if (
        hydrated.academicLevelId === current.academicLevelId &&
        hydrated.programmeId === current.programmeId &&
        hydrated.departmentId === current.departmentId &&
        hydrated.semesterId === current.semesterId &&
        hydrated.classNodeId === current.classNodeId
      ) {
        return current;
      }
      return hydrated;
    });
  }, [taxonomy]);

  // Debounce search text into the real filter used by the API.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => {
        if (current.q === searchDraft) return current;
        return { ...current, q: searchDraft, page: 1 };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value != null)
    );
    const requestParams = { ...params, limit: 20 };
    const cachedPapers = readPapersCache(requestParams);
    if (cachedPapers) {
      setPapers(cachedPapers.items || []);
      setMeta(cachedPapers.meta || null);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError('');

    let cancelled = false;
    publicApi
      .papers(requestParams)
      .then((res) => {
        if (cancelled) return;
        const items = res.data.data || [];
        const metaData = res.data.meta;
        setPapers(items);
        setMeta(metaData);
        writePapersCache(requestParams, { items, meta: metaData });
      })
      .catch((err) => {
        if (cancelled) return;
        if (!cachedPapers) {
          setError(err.response?.data?.message || 'Unable to load question papers right now. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function setFilter(key, value) {
    setFilters((current) => {
      const next = applyCascadeReset(current, key, value);
      return { ...next, page: 1 };
    });
  }

  function clearFilters() {
    setSearchDraft('');
    setFilters({ ...initialFilters });
  }

  const showStreams =
    selectedLevel &&
    isSchoolBand(selectedLevel) &&
    hasStreamProgrammes(taxonomy, filters.academicLevelId);
  const showClasses =
    selectedLevel &&
    isSchoolBand(selectedLevel) &&
    (!showStreams || filters.programmeId);
  const showProgrammes = selectedLevel && usesProgrammeCascade(selectedLevel);
  const showDepartments = showProgrammes && Boolean(filters.programmeId);
  const showSemesters = showDepartments && Boolean(filters.departmentId);
  const showSchoolSubjects = showClasses && Boolean(filters.classNodeId);
  const showHigherEdSubjects = showSemesters && Boolean(filters.semesterId);
  const showSubjects = showSchoolSubjects || showHigherEdSubjects;
  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'page' && value !== '' && value != null
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Question papers</h1>
          <p className="mt-2 text-ink-700/70 dark:text-sand-100/70">{browseHelperText(selectedLevel)}</p>
        </div>
        {hasActiveFilters ? (
          <button type="button" className="btn-secondary !py-1.5" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="panel grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input
          className="input lg:col-span-3"
          placeholder="Search papers..."
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          aria-label="Search question papers"
        />

        <FilterSelect
          label="Academic Level"
          value={filters.academicLevelId}
          onChange={(value) => setFilter('academicLevelId', value)}
          options={taxonomy?.academicLevels || []}
          placeholder="All academic levels"
        />

        {showStreams ? (
          <FilterSelect
            label="Stream"
            value={filters.programmeId}
            onChange={(value) => setFilter('programmeId', value)}
            options={cascadeOptions.streams}
            placeholder="All streams"
          />
        ) : null}

        {showProgrammes ? (
          <FilterSelect
            label="Programme"
            value={filters.programmeId}
            onChange={(value) => setFilter('programmeId', value)}
            options={cascadeOptions.programmes}
            placeholder="All programmes"
          />
        ) : null}

        {showDepartments ? (
          <FilterSelect
            label="Department"
            value={filters.departmentId}
            onChange={(value) => setFilter('departmentId', value)}
            options={cascadeOptions.departments}
            placeholder="All departments"
          />
        ) : null}

        {showSemesters ? (
          <FilterSelect
            label="Semester"
            value={filters.semesterId}
            onChange={(value) => setFilter('semesterId', value)}
            options={cascadeOptions.semesters}
            placeholder="All semesters"
            taxonomy={taxonomy}
            withContext={false}
          />
        ) : null}

        {showClasses ? (
          <FilterSelect
            label="Class"
            value={filters.classNodeId}
            onChange={(value) => setFilter('classNodeId', value)}
            options={cascadeOptions.classes}
            placeholder="All classes"
          />
        ) : null}

        {showSubjects ? (
          <FilterSelect
            label="Subject"
            value={filters.subjectId}
            onChange={(value) => setFilter('subjectId', value)}
            options={cascadeOptions.subjects}
            placeholder="All subjects"
          />
        ) : null}

        <FilterSelect
          label="Examination Type"
          value={filters.paperTypeId}
          onChange={(value) => setFilter('paperTypeId', value)}
          options={taxonomy?.paperTypes || []}
          placeholder="All examination types"
        />
        <FilterSelect
          label="Resource Type"
          value={filters.resourceTypeId}
          onChange={(value) => setFilter('resourceTypeId', value)}
          options={taxonomy?.resourceTypes || []}
          placeholder="All resource types"
        />
      </div>

      {loading && papers.length === 0 && <LoadingSkeleton rows={5} />}
      {error && papers.length === 0 && <ErrorState message={error} />}
      {!loading && !error && papers.length === 0 && (
        <EmptyState title="No matching papers" message="Try clearing filters or searching a different term." />
      )}

      <div className="space-y-3">
        {papers.map((paper) => (
          <Link key={paper._id} to={`/papers/${paper._id}`} className="panel block hover:border-moss-400/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{paper.title}</p>
                <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
                  {[
                    paper.academicLevelId?.name,
                    paper.programmeId?.name,
                    paper.departmentId?.name,
                    paper.semesterId?.name || paper.classNodeId?.name,
                    paper.subjectId?.name,
                    paper.paperTypeId?.name || paper.resourceTypeId?.name,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <p className="text-sm">{paper.downloadCount || 0} downloads</p>
            </div>
          </Link>
        ))}
      </div>

      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-ink-700/70 dark:text-sand-100/70">
            Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}{' '}
            papers
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary !py-1.5"
              disabled={!meta.hasPrevPage}
              onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary !py-1.5"
              disabled={!meta.hasNextPage}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
