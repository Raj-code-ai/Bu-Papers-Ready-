import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function SuperAdminSystemPage() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superAdminApi
      .getSystemConfig()
      .then((res) => {
        const data = res.data.data || {};
        setForm({
          maintenanceMode: Boolean(data.maintenanceMode),
          maintenanceBlockPublic: data.maintenanceBlockPublic !== false,
          maintenanceMessage:
            data.maintenanceMessage ||
            'Website temporarily unavailable while maintenance is being performed.',
          appName: data.appName || '',
        });
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await superAdminApi.updateSystemConfig(form);
      setMessage('System settings saved. Maintenance mode updates apply within a few seconds.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!form) return <ErrorState message={error || 'Unable to load system config'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">System settings</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Maintenance mode blocks the public site while Admin and Super Admin retain console access.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <form onSubmit={onSave} className="panel space-y-4">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.maintenanceMode}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceMode: e.target.checked }))}
          />
          Enable maintenance mode
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.maintenanceBlockPublic}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceBlockPublic: e.target.checked }))}
          />
          Block public website during maintenance
        </label>
        <label className="block text-sm">
          Maintenance message
          <textarea
            className="input mt-1"
            rows={3}
            value={form.maintenanceMessage}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceMessage: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          App name
          <input
            className="input mt-1"
            value={form.appName}
            onChange={(e) => setForm((f) => ({ ...f, appName: e.target.value }))}
          />
        </label>
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save system settings'}
        </button>
      </form>
    </div>
  );
}
