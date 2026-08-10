import { useCallback, useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { useInstitution } from '../../store/InstitutionContext';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

const EMPTY_FORM = {
  name: '',
  role: '',
  education: '',
  semester: '',
  department: '',
  bio: '',
  github: '',
  linkedin: '',
  portfolio: '',
  email: '',
};

export default function SuperAdminDevelopersPage() {
  const { refresh } = useInstitution();
  const [developers, setDevelopers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await superAdminApi.listDevelopers();
    setDevelopers(res.data.data || []);
  }, []);

  useEffect(() => {
    load()
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [load]);

  function startEdit(dev) {
    setEditingId(dev.id);
    setForm({
      name: dev.name || '',
      role: dev.role || '',
      education: dev.education || '',
      semester: dev.semester || '',
      department: dev.department || '',
      bio: dev.bio || '',
      github: dev.github || '',
      linkedin: dev.linkedin || '',
      portfolio: dev.portfolio || '',
      email: dev.email || '',
    });
    setPhotoFile(null);
    setMessage('');
    setError('');
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      let id = editingId;
      if (editingId) {
        await superAdminApi.updateDeveloper(editingId, form);
        setMessage('Developer updated.');
      } else {
        const created = await superAdminApi.createDeveloper(form);
        id = created.data.data?.id;
        setMessage('Developer created.');
      }
      if (photoFile && id) {
        const body = new FormData();
        body.append('photo', photoFile);
        await superAdminApi.uploadDeveloperPhoto(id, body);
        setMessage((m) => `${m} Photo uploaded.`);
      }
      resetForm();
      await load();
      await refresh().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id, name) {
    if (!window.confirm(`Delete developer "${name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await superAdminApi.deleteDeveloper(id);
      setMessage(`Deleted ${name}.`);
      if (editingId === id) resetForm();
      await load();
      await refresh().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function onPhotoOnly(id, file) {
    if (!file) return;
    setError('');
    try {
      const body = new FormData();
      body.append('photo', file);
      await superAdminApi.uploadDeveloperPhoto(id, body);
      setMessage('Photo updated.');
      await load();
      await refresh().catch(() => {});
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Developers</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Create, edit, or delete public developer profiles and upload photos.
        </p>
      </div>

      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <form onSubmit={onSubmit} className="panel grid gap-3 md:grid-cols-2">
        <h2 className="font-display text-xl md:col-span-2">
          {editingId ? 'Edit developer' : 'Add developer'}
        </h2>
        {[
          ['name', 'Name', true],
          ['role', 'Role', false],
          ['education', 'Education / university', false],
          ['semester', 'Class / semester (optional)', false],
          ['department', 'Department', false],
          ['email', 'Email (optional)', false],
          ['github', 'GitHub URL (optional)', false],
          ['linkedin', 'LinkedIn URL (optional)', false],
          ['portfolio', 'Portfolio URL (optional)', false],
        ].map(([key, label, required]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="input mt-1"
              required={required}
              type={key === 'email' ? 'email' : 'text'}
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="block text-sm md:col-span-2">
          Short bio
          <textarea
            className="input mt-1"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          Photo (JPEG/PNG/WebP/GIF, max 2 MB)
          <input
            className="input mt-1"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add developer'}
          </button>
          {editingId ? (
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>

      {developers.length === 0 ? (
        <EmptyState title="No developers yet" message="Add the first developer profile above." />
      ) : (
        <div className="space-y-3">
          {developers.map((dev) => (
            <div key={dev.id} className="panel flex flex-wrap items-start gap-4">
              {dev.photoUrl ? (
                <img
                  src={dev.photoUrl}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-moss-500/10 font-display text-xl text-moss-500">
                  {(dev.name || '?')[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{dev.name}</p>
                <p className="text-sm text-moss-500">{dev.role}</p>
                <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
                  {[dev.education, dev.semester, dev.department].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="btn-secondary !py-1.5 cursor-pointer">
                  Upload photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => onPhotoOnly(dev.id, e.target.files?.[0])}
                  />
                </label>
                <button type="button" className="btn-secondary !py-1.5" onClick={() => startEdit(dev)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-secondary !py-1.5"
                  onClick={() => onDelete(dev.id, dev.name)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
