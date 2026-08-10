import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await superAdminApi.listAdmins();
    setAdmins(res.data.data || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      await superAdminApi.createAdmin(form);
      setForm({ name: '', email: '', password: '' });
      setMessage('Admin created.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  async function resetPassword(id) {
    const newPassword = window.prompt('Enter a strong new Admin password (min 10 chars, mixed case, number, symbol)');
    if (!newPassword) return;
    try {
      await superAdminApi.resetAdminPassword(id, { newPassword });
      setMessage('Admin password reset.');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Admin management</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Only Super Admin can create or reset Admin accounts. No public registration.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      <form onSubmit={onCreate} className="panel grid gap-3 md:grid-cols-3">
        <input
          className="input"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <input
          className="input"
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <input
          className="input"
          type="password"
          placeholder="Temporary password"
          required
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <button className="btn-primary md:col-span-3" type="submit">
          Create Admin
        </button>
      </form>

      {admins.length === 0 ? (
        <EmptyState title="No admins yet" message="Create the official Admin account for paper management." />
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <div key={admin.id} className="panel flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {admin.name} · {admin.email}
                </p>
                <p className="text-sm text-ink-700/70 dark:text-sand-100/70">
                  {admin.isActive ? 'Active' : 'Disabled'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary !py-1.5" onClick={() => resetPassword(admin.id)}>
                  Reset password
                </button>
                {admin.isActive ? (
                  <button
                    type="button"
                    className="btn-secondary !py-1.5"
                    onClick={async () => {
                      await superAdminApi.disableAdmin(admin.id);
                      await load();
                    }}
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary !py-1.5"
                    onClick={async () => {
                      await superAdminApi.enableAdmin(admin.id);
                      await load();
                    }}
                  >
                    Enable
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
