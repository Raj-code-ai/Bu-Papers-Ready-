import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function SuperAdminSecurityPage() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    superAdminApi
      .getSecurityPolicy()
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
      const res = await superAdminApi.updateSecurityPolicy(form);
      setForm(res.data.data || form);
      setMessage('Security policy saved.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (!form) return <ErrorState message={error || 'Unable to load security policy'} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Security policy</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Password rules, session limits, and account lockout settings.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <form onSubmit={onSave} className="panel space-y-4">
        <label className="block text-sm">
          Minimum password length
          <input
            className="input mt-1"
            type="number"
            min={8}
            value={form.minPasswordLength ?? 10}
            onChange={(e) => setForm((f) => ({ ...f, minPasswordLength: Number(e.target.value) }))}
          />
        </label>
        {[
          ['requireUppercase', 'Require uppercase'],
          ['requireLowercase', 'Require lowercase'],
          ['requireNumber', 'Require number'],
          ['requireSpecial', 'Require special character'],
          ['superAdmin2faRequired', 'Super Admin 2FA required'],
          ['allowConcurrentSessions', 'Allow concurrent sessions'],
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
        {[
          ['sessionTimeoutMinutes', 'Session timeout (minutes)'],
          ['accountLockMaxAttempts', 'Max failed login attempts'],
          ['accountLockDurationMinutes', 'Lockout duration (minutes)'],
          ['passwordResetTokenExpiresMinutes', 'Password reset token expiry (minutes)'],
          ['maxConcurrentSessions', 'Max concurrent sessions'],
        ].map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="input mt-1"
              type="number"
              min={1}
              value={form[key] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
            />
          </label>
        ))}
        <button className="btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save security policy'}
        </button>
      </form>
    </div>
  );
}
