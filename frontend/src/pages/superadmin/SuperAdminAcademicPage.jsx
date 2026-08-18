import { useCallback, useEffect, useMemo, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

const RESOURCES = [
  {
    key: 'levels',
    label: 'Levels',
    filters: [],
    createFields: ['kind'],
    kindOptions: ['school_band', 'ug', 'pg', 'other'],
  },
  {
    key: 'programmes',
    label: 'Programmes',
    filters: ['academicLevelId'],
    createFields: ['academicLevelId', 'parentProgrammeId', 'kind'],
    kindOptions: ['stream', 'background', 'degree', 'other'],
  },
  {
    key: 'departments',
    label: 'Departments',
    filters: ['programmeId'],
    createFields: ['programmeId'],
  },
  {
    key: 'semesters',
    label: 'Semesters',
    filters: ['academicLevelId', 'programmeId', 'departmentId'],
    createFields: ['academicLevelId', 'programmeId', 'departmentId', 'number'],
  },
  {
    key: 'classes',
    label: 'Classes',
    filters: ['academicLevelId', 'programmeId', 'departmentId'],
    createFields: ['academicLevelId', 'programmeId', 'departmentId'],
  },
  {
    key: 'subjects',
    label: 'Subjects',
    filters: ['academicLevelId', 'programmeId', 'departmentId', 'semesterId', 'classNodeId'],
    createFields: ['academicLevelId', 'programmeId', 'departmentId', 'semesterId', 'classNodeId', 'code'],
  },
  { key: 'resource-types', label: 'Resource types', filters: [], createFields: ['featureKey'] },
  { key: 'paper-types', label: 'Paper types', filters: [], createFields: [] },
];

const FILTER_SOURCES = {
  academicLevelId: { resource: 'levels', label: 'Level' },
  programmeId: { resource: 'programmes', label: 'Programme' },
  parentProgrammeId: { resource: 'programmes', label: 'Parent programme' },
  departmentId: { resource: 'departments', label: 'Department' },
  semesterId: { resource: 'semesters', label: 'Semester' },
  classNodeId: { resource: 'classes', label: 'Class' },
};

function itemId(item) {
  return item.id || item._id;
}

function idEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function emptyCreateForm(resource) {
  const base = { name: '' };
  const cfg = RESOURCES.find((r) => r.key === resource);
  (cfg?.createFields || []).forEach((field) => {
    if (field === 'isCurrent') base[field] = false;
    else if (field === 'number' || field === 'startYear' || field === 'endYear') base[field] = '';
    else if (field === 'kind') base[field] = cfg.kindOptions?.[0] || 'other';
    else base[field] = '';
  });
  return base;
}

function optionLabel(field, opt, lookup) {
  const bits = [opt.name];
  if (opt.kind) bits.push(`(${opt.kind})`);
  if (field === 'semesterId' || field === 'classNodeId') {
    const dep = (lookup.departmentId || []).find((d) => idEq(itemId(d), opt.departmentId));
    const prog = (lookup.programmeId || []).find((p) => idEq(itemId(p), opt.programmeId));
    const level = (lookup.academicLevelId || []).find((l) => idEq(itemId(l), opt.academicLevelId));
    const context = [dep?.name, prog?.name, level?.name].filter(Boolean);
    if (context.length) bits.push(`· ${context.join(' / ')}`);
  } else if (field === 'departmentId') {
    const prog = (lookup.programmeId || []).find((p) => idEq(itemId(p), opt.programmeId));
    if (prog?.name) bits.push(`· ${prog.name}`);
  } else if (field === 'programmeId') {
    const level = (lookup.academicLevelId || []).find((l) => idEq(itemId(l), opt.academicLevelId));
    if (level?.name) bits.push(`· ${level.name}`);
  }
  return bits.join(' ');
}

export default function SuperAdminAcademicPage() {
  const [resource, setResource] = useState('levels');
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [createForm, setCreateForm] = useState(emptyCreateForm('levels'));
  const [editingId, setEditingId] = useState('');
  const [editName, setEditName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const cfg = useMemo(() => RESOURCES.find((r) => r.key === resource), [resource]);

  const selectedLevel = useMemo(() => {
    if (!createForm.academicLevelId) return null;
    return (filterOptions.academicLevelId || []).find((item) =>
      idEq(itemId(item), createForm.academicLevelId)
    );
  }, [createForm.academicLevelId, filterOptions.academicLevelId]);

  const selectedLevelKind = selectedLevel?.kind || '';
  const isSchoolSubject = resource === 'subjects' && selectedLevelKind === 'school_band';
  const isHigherEdSubject =
    resource === 'subjects' && (selectedLevelKind === 'ug' || selectedLevelKind === 'pg');

  const filterFieldOptions = useMemo(() => {
    const levelId = filters.academicLevelId;
    const programmeId = filters.programmeId;
    const departmentId = filters.departmentId;

    return {
      academicLevelId: filterOptions.academicLevelId || [],
      programmeId: (filterOptions.programmeId || []).filter(
        (item) => !levelId || idEq(item.academicLevelId, levelId)
      ),
      departmentId: (filterOptions.departmentId || []).filter(
        (item) => !programmeId || idEq(item.programmeId, programmeId)
      ),
      semesterId: (filterOptions.semesterId || []).filter((item) => {
        if (departmentId) return idEq(item.departmentId, departmentId);
        if (programmeId) return idEq(item.programmeId, programmeId);
        if (levelId) return idEq(item.academicLevelId, levelId);
        return true;
      }),
      classNodeId: (filterOptions.classNodeId || []).filter((item) => {
        if (departmentId && item.departmentId) return idEq(item.departmentId, departmentId);
        if (programmeId && item.programmeId) return idEq(item.programmeId, programmeId);
        if (levelId) return idEq(item.academicLevelId, levelId);
        return true;
      }),
    };
  }, [filters, filterOptions]);

  const createFieldOptions = useMemo(() => {
    const levelId = createForm.academicLevelId;
    const programmeId = createForm.programmeId;
    const departmentId = createForm.departmentId;

    const levels = filterOptions.academicLevelId || [];
    const programmes = (filterOptions.programmeId || []).filter(
      (item) => !levelId || idEq(item.academicLevelId, levelId)
    );
    const departments = (filterOptions.departmentId || []).filter(
      (item) => !programmeId || idEq(item.programmeId, programmeId)
    );
    const semesters = (filterOptions.semesterId || []).filter((item) => {
      if (departmentId) return idEq(item.departmentId, departmentId);
      if (programmeId) return idEq(item.programmeId, programmeId);
      if (levelId) return idEq(item.academicLevelId, levelId);
      return true;
    });
    const classes = (filterOptions.classNodeId || []).filter((item) => {
      if (departmentId && item.departmentId) return idEq(item.departmentId, departmentId);
      if (programmeId && item.programmeId) return idEq(item.programmeId, programmeId);
      if (levelId) return idEq(item.academicLevelId, levelId);
      return true;
    });

    return {
      academicLevelId: levels,
      programmeId: programmes,
      parentProgrammeId: filterOptions.parentProgrammeId || [],
      departmentId: departments,
      semesterId: semesters,
      classNodeId: classes,
    };
  }, [createForm, filterOptions]);

  const loadFilterOptions = useCallback(async (resKey) => {
    const resCfg = RESOURCES.find((r) => r.key === resKey);
    const needed = [...(resCfg?.filters || []), ...(resCfg?.createFields || [])].filter(
      (f) => FILTER_SOURCES[f]
    );
    const unique = [...new Set(needed)];
    const entries = await Promise.all(
      unique.map(async (field) => {
        const src = FILTER_SOURCES[field];
        const res = await superAdminApi.listTaxonomy(src.resource, { limit: 2000 });
        return [field, res.data.data || []];
      })
    );
    setFilterOptions((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 2000, ...filters };
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k];
      });
      const res = await superAdminApi.listTaxonomy(resource, params);
      setItems(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [resource, filters]);

  useEffect(() => {
    setCreateForm(emptyCreateForm(resource));
    setFilters({});
    setEditingId('');
  }, [resource]);

  useEffect(() => {
    loadFilterOptions(resource).catch(() => {});
  }, [resource, loadFilterOptions]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function onCreate(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      if (resource === 'subjects' && !createForm.semesterId && !createForm.classNodeId) {
        setError('Choose a semester (UG/PG) or a class (school) before adding a subject.');
        return;
      }
      const payload = { ...createForm };
      if (payload.number !== undefined && payload.number !== '') payload.number = Number(payload.number);
      if (payload.startYear !== undefined && payload.startYear !== '')
        payload.startYear = Number(payload.startYear);
      if (payload.endYear !== undefined && payload.endYear !== '')
        payload.endYear = Number(payload.endYear);
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') delete payload[k];
      });
      await superAdminApi.createTaxonomy(resource, payload);
      setCreateForm(emptyCreateForm(resource));
      setMessage('Item created.');
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function toggleEnabled(item) {
    setError('');
    try {
      await superAdminApi.updateTaxonomy(resource, itemId(item), { isEnabled: !item.isEnabled });
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function saveEdit(id) {
    if (!editName.trim()) return;
    setError('');
    try {
      await superAdminApi.updateTaxonomy(resource, id, { name: editName.trim() });
      setEditingId('');
      setEditName('');
      setMessage('Item updated.');
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    setMessage('');
    setError('');
    try {
      await superAdminApi.deleteTaxonomy(resource, id);
      setMessage('Item deleted.');
      await loadItems();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function onEnsureStandardSemesters() {
    setMessage('');
    setError('');
    try {
      const res = await superAdminApi.ensureStandardSemesters();
      const data = res.data.data || {};
      setMessage(
        `Standard semesters ready: ${data.semestersCreated || 0} created, ${data.semestersExisting || 0} already present across ${data.departmentsProcessed || 0} UG/PG departments (UG 1–8, PG 1–4).`
      );
      if (resource === 'semesters') await loadItems();
      await loadFilterOptions(resource);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  function setFilterField(field, value) {
    setFilters((current) => {
      const next = { ...current, [field]: value };
      if (field === 'academicLevelId') {
        next.programmeId = '';
        next.departmentId = '';
        next.semesterId = '';
        next.classNodeId = '';
      } else if (field === 'programmeId') {
        next.departmentId = '';
        next.semesterId = '';
        next.classNodeId = '';
      } else if (field === 'departmentId') {
        next.semesterId = '';
        next.classNodeId = '';
      }
      return next;
    });
  }

  function setCreateField(field, value) {
    setCreateForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'academicLevelId') {
        next.programmeId = '';
        next.departmentId = '';
        next.semesterId = '';
        next.classNodeId = '';
      } else if (field === 'programmeId') {
        next.departmentId = '';
        next.semesterId = '';
        next.classNodeId = '';
      } else if (field === 'departmentId') {
        next.semesterId = '';
        next.classNodeId = '';
      } else if (field === 'number') {
        const num = Number(value);
        if (num) next.name = `Semester ${num}`;
      } else if (field === 'semesterId' && value) {
        const semester = (filterOptions.semesterId || []).find((item) => idEq(itemId(item), value));
        if (semester) {
          next.academicLevelId = semester.academicLevelId ? String(semester.academicLevelId) : next.academicLevelId;
          next.programmeId = semester.programmeId ? String(semester.programmeId) : next.programmeId;
          next.departmentId = semester.departmentId ? String(semester.departmentId) : next.departmentId;
          next.classNodeId = '';
        }
      } else if (field === 'classNodeId' && value) {
        const classNode = (filterOptions.classNodeId || []).find((item) => idEq(itemId(item), value));
        if (classNode) {
          next.academicLevelId = classNode.academicLevelId
            ? String(classNode.academicLevelId)
            : next.academicLevelId;
          next.programmeId = classNode.programmeId ? String(classNode.programmeId) : next.programmeId;
          next.departmentId = classNode.departmentId ? String(classNode.departmentId) : next.departmentId;
          next.semesterId = '';
        }
      }
      return next;
    });
  }

  function renderSelect(field, label, value, onChange, required = false, optionsOverride) {
    const options = optionsOverride || filterOptions[field] || [];
    return (
      <label key={field} className="block text-sm">
        {label}
        <select
          className="input mt-1"
          value={value || ''}
          required={required}
          onChange={(e) => onChange(e.target.value || '')}
        >
          <option value="">— Select —</option>
          {options.map((opt) => (
            <option key={itemId(opt)} value={itemId(opt)}>
              {optionLabel(field, opt, filterOptions)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Academic structure</h1>
          <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
            Manage levels, programmes, departments, and related taxonomy used for paper uploads.
          </p>
        </div>
        <button type="button" className="btn-secondary !py-1.5" onClick={onEnsureStandardSemesters}>
          Ensure UG 1–8 / PG 1–4 semesters
        </button>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <div className="flex flex-wrap gap-2">
        {RESOURCES.map((r) => (
          <button
            key={r.key}
            type="button"
            className={resource === r.key ? 'btn-primary !py-1.5' : 'btn-secondary !py-1.5'}
            onClick={() => setResource(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {(cfg?.filters || []).length > 0 && (
        <div className="panel grid gap-3 md:grid-cols-3">
          {cfg.filters.map((field) =>
            renderSelect(
              field,
              `Filter by ${FILTER_SOURCES[field]?.label || field}`,
              filters[field],
              (val) => setFilterField(field, val),
              false,
              filterFieldOptions[field]
            )
          )}
          <div className="flex items-end">
            <button type="button" className="btn-secondary !py-1.5" onClick={() => setFilters({})}>
              Clear filters
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onCreate} className="panel grid gap-3 md:grid-cols-3">
        {resource === 'subjects' ? (
          <p className="md:col-span-3 text-sm text-ink-700/70 dark:text-sand-100/70">
            UG/PG: Level → Programme → Department → Semester → subject name.
            School: Level → Class → subject name. Semester labels include department so you pick the right one.
          </p>
        ) : null}
        {resource === 'semesters' ? (
          <p className="md:col-span-3 text-sm text-ink-700/70 dark:text-sand-100/70">
            Prefer “Ensure UG 1–8 / PG 1–4 semesters” for every department. Manual create needs Level →
            Programme → Department → semester number.
          </p>
        ) : null}
        <label className="block text-sm md:col-span-3">
          Name
          <input
            className="input mt-1"
            required={resource !== 'semesters'}
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            placeholder={resource === 'semesters' ? 'Auto-filled from semester number' : ''}
          />
        </label>
        {cfg?.createFields?.includes('kind') && (
          <label className="block text-sm">
            Kind
            <select
              className="input mt-1"
              value={createForm.kind || cfg.kindOptions?.[0] || 'other'}
              required
              onChange={(e) => setCreateForm((f) => ({ ...f, kind: e.target.value }))}
            >
              {(cfg.kindOptions || ['other']).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
        {cfg?.createFields?.includes('academicLevelId') &&
          renderSelect(
            'academicLevelId',
            'Level',
            createForm.academicLevelId,
            (val) => setCreateField('academicLevelId', val),
            resource === 'programmes' || resource === 'subjects' || resource === 'semesters',
            createFieldOptions.academicLevelId
          )}
        {cfg?.createFields?.includes('parentProgrammeId') &&
          renderSelect(
            'parentProgrammeId',
            'Parent programme (optional)',
            createForm.parentProgrammeId,
            (val) => setCreateForm((f) => ({ ...f, parentProgrammeId: val })),
            false,
            createFieldOptions.parentProgrammeId
          )}
        {cfg?.createFields?.includes('programmeId') &&
          renderSelect(
            'programmeId',
            'Programme',
            createForm.programmeId,
            (val) => setCreateField('programmeId', val),
            resource === 'departments' || resource === 'subjects' || resource === 'semesters',
            createFieldOptions.programmeId
          )}
        {cfg?.createFields?.includes('departmentId') &&
          renderSelect(
            'departmentId',
            'Department',
            createForm.departmentId,
            (val) => setCreateField('departmentId', val),
            resource === 'subjects' || resource === 'semesters',
            createFieldOptions.departmentId
          )}
        {cfg?.createFields?.includes('semesterId') && !isSchoolSubject &&
          renderSelect(
            'semesterId',
            'Semester (UG/PG)',
            createForm.semesterId,
            (val) => setCreateField('semesterId', val),
            isHigherEdSubject,
            createFieldOptions.semesterId
          )}
        {cfg?.createFields?.includes('classNodeId') && !isHigherEdSubject &&
          renderSelect(
            'classNodeId',
            'Class (school only)',
            createForm.classNodeId,
            (val) => setCreateField('classNodeId', val),
            isSchoolSubject,
            createFieldOptions.classNodeId
          )}
        {cfg?.createFields?.includes('number') && (
          <label className="block text-sm">
            Semester number
            <input
              className="input mt-1"
              type="number"
              min={1}
              max={selectedLevelKind === 'pg' ? 4 : 8}
              required={resource === 'semesters'}
              value={createForm.number}
              onChange={(e) => setCreateField('number', e.target.value)}
            />
          </label>
        )}
        {cfg?.createFields?.includes('code') && (
          <label className="block text-sm">
            Subject code
            <input
              className="input mt-1"
              value={createForm.code}
              onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
            />
          </label>
        )}
        {cfg?.createFields?.includes('featureKey') && (
          <label className="block text-sm">
            Feature key (optional)
            <input
              className="input mt-1"
              value={createForm.featureKey || ''}
              onChange={(e) => setCreateForm((f) => ({ ...f, featureKey: e.target.value }))}
            />
          </label>
        )}
        {cfg?.createFields?.includes('startYear') && (
          <>
            <label className="block text-sm">
              Start year
              <input
                className="input mt-1"
                type="number"
                required
                value={createForm.startYear}
                onChange={(e) => setCreateForm((f) => ({ ...f, startYear: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              End year
              <input
                className="input mt-1"
                type="number"
                required
                value={createForm.endYear}
                onChange={(e) => setCreateForm((f) => ({ ...f, endYear: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(createForm.isCurrent)}
                onChange={(e) => setCreateForm((f) => ({ ...f, isCurrent: e.target.checked }))}
              />
              Current academic year
            </label>
          </>
        )}
        <button className="btn-primary md:col-span-3" type="submit">
          Add {cfg?.label?.slice(0, -1) || 'item'}
        </button>
      </form>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState title="No items" message={`No ${cfg?.label?.toLowerCase()} match the current filters.`} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const id = itemId(item);
            return (
              <div key={id} className="panel flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingId === id ? (
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <button type="button" className="btn-primary !py-1.5" onClick={() => saveEdit(id)}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-secondary !py-1.5"
                        onClick={() => {
                          setEditingId('');
                          setEditName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-ink-700/70 dark:text-sand-100/70">
                        {item.kind ? `Kind: ${item.kind} · ` : ''}
                        {item.number != null ? `Number: ${item.number} · ` : ''}
                        {item.code ? `Code: ${item.code} · ` : ''}
                        {item.departmentId
                          ? `Dept: ${(filterOptions.departmentId || []).find((d) => idEq(itemId(d), item.departmentId))?.name || '—'} · `
                          : ''}
                        {item.semesterId
                          ? `Sem: ${(filterOptions.semesterId || []).find((s) => idEq(itemId(s), item.semesterId))?.name || 'linked'} · `
                          : ''}
                        {item.isEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </>
                  )}
                </div>
                {editingId !== id && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary !py-1.5" onClick={() => toggleEnabled(item)}>
                      {item.isEnabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !py-1.5"
                      onClick={() => {
                        setEditingId(id);
                        setEditName(item.name);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="btn-secondary !py-1.5" onClick={() => onDelete(id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
