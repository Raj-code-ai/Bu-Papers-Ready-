import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

const FIELDS = [
  ['maxFileSizeMb', 'Max file size (MB)', 'number'],
  ['adminQuotaMb', 'Admin quota (MB)', 'number'],
  ['recycleBinRetentionDays', 'Recycle bin retention (days)', 'number'],
  ['monthlyBudgetUsd', 'Monthly budget (USD)', 'number'],
  ['warningPercent', 'Warning threshold (%)', 'number'],
  ['criticalPercent', 'Critical threshold (%)', 'number'],
  ['largeUploadThresholdMb', 'Large upload threshold (MB)', 'number'],
  ['cloudProvider', 'Cloud provider', 'select'],
];

export default function SuperAdminStoragePolicyPage() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superAdminApi
      .getStoragePolicy()
      .then((res) => setForm(res.data.data || {}))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await superAdminApi.updateStoragePolicy(form);
      setForm(res.data.data || form);
      setMessage('Storage policy saved.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!form) return <ErrorState message={error || 'Unable to load storage policy'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Storage policy</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          File size limits, quotas, cloud provider, and storage alert thresholds.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <form onSubmit={onSave} className="panel grid gap-4 md:grid-cols-2">
        {FIELDS.map(([key, label, type]) =>
          type === 'select' ? (
            <label key={key} className="block text-sm">
              {label}
              <select
                className="input mt-1"
                value={form[key] || 'cloudinary'}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              >
                <option value="cloudinary">Cloudinary</option>
                <option value="s3">S3</option>
                <option value="gcs">GCS</option>
              </select>
            </label>
          ) : (
            <label key={key} className="block text-sm">
              {label}
              <input
                className="input mt-1"
                type="number"
                value={form[key] ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
              />
            </label>
          )
        )}
        {[
          ['duplicateDetection', 'Duplicate detection'],
          ['compression', 'Enable compression'],
          ['autoCleanup', 'Auto cleanup'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
        <button className="btn-primary md:col-span-2" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save storage policy'}
        </button>
      </form>
    </div>
  );
}
