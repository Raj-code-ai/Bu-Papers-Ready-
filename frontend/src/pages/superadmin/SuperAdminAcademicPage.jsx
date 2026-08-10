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

  const loadFilterOptions = useCallback(async (resKey) => {
    const resCfg = RESOURCES.find((r) => r.key === resKey);
    const needed = [...(resCfg?.filters || []), ...(resCfg?.createFields || [])].filter(
      (f) => FILTER_SOURCES[f]
    );
    const unique = [...new Set(needed)];
    const entries = await Promise.all(
      unique.map(async (field) => {
        const src = FILTER_SOURCES[field];
        const res = await superAdminApi.listTaxonomy(src.resource, { limit: 500 });
        return [field, res.data.data || []];
      })
    );
    setFilterOptions((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 500, ...filters };
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

  function renderSelect(field, label, value, onChange, required = false) {
    const options = filterOptions[field] || [];
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
              {opt.name}
              {opt.kind ? ` (${opt.kind})` : ''}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Academic structure</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Manage levels, programmes, departments, and related taxonomy used for paper uploads.
        </p>
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
              (val) => setFilters((f) => ({ ...f, [field]: val }))
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
        <label className="block text-sm md:col-span-3">
          Name
          <input
            className="input mt-1"
            required
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
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
            (val) => setCreateForm((f) => ({ ...f, academicLevelId: val })),
            resource === 'programmes'
          )}
        {cfg?.createFields?.includes('parentProgrammeId') &&
          renderSelect('parentProgrammeId', 'Parent programme (optional)', createForm.parentProgrammeId, (val) =>
            setCreateForm((f) => ({ ...f, parentProgrammeId: val }))
          )}
        {cfg?.createFields?.includes('programmeId') &&
          renderSelect('programmeId', 'Programme', createForm.programmeId, (val) =>
            setCreateForm((f) => ({ ...f, programmeId: val }))
          , resource === 'departments')}
        {cfg?.createFields?.includes('departmentId') &&
          renderSelect('departmentId', 'Department', createForm.departmentId, (val) =>
            setCreateForm((f) => ({ ...f, departmentId: val }))
          )}
        {cfg?.createFields?.includes('semesterId') &&
          renderSelect('semesterId', 'Semester', createForm.semesterId, (val) =>
            setCreateForm((f) => ({ ...f, semesterId: val }))
          )}
        {cfg?.createFields?.includes('classNodeId') &&
          renderSelect('classNodeId', 'Class', createForm.classNodeId, (val) =>
            setCreateForm((f) => ({ ...f, classNodeId: val }))
          )}
        {cfg?.createFields?.includes('number') && (
          <label className="block text-sm">
            Semester number
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={createForm.number}
              onChange={(e) => setCreateForm((f) => ({ ...f, number: e.target.value }))}
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
                        {item.code ? `Code: ${item.code} · ` : ''}
                        {item.startYear ? `${item.startYear}–${item.endYear} · ` : ''}
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
