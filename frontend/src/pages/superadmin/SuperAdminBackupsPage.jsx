import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

export default function SuperAdminBackupsPage() {
  const [backups, setBackups] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  async function load() {
    const res = await superAdminApi.listBackups({ limit: 50 });
    setBackups(res.data.data || []);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onCreate() {
    setBusy('create');
    setMessage('');
    setError('');
    try {
      await superAdminApi.createBackup({ type: 'manual' });
      setMessage('Backup created.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  }

  async function onVerify(id) {
    setBusy(`verify-${id}`);
    setMessage('');
    setError('');
    try {
      const res = await superAdminApi.verifyBackup(id);
      const verified = res.data.data?.verified;
      setMessage(verified ? 'Backup verified successfully.' : 'Backup verification failed — checksum mismatch.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  }

  async function onRestore(id) {
    if (
      !window.confirm(
        'Restore this backup? This will overwrite current data. Only proceed if you are certain.'
      )
    ) {
      return;
    }
    setBusy(`restore-${id}`);
    setMessage('');
    setError('');
    try {
      await superAdminApi.restoreBackup(id);
      setMessage('Backup restore started. Monitor system health after completion.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  }

  async function onDownload(id) {
    setBusy(`download-${id}`);
    setError('');
    try {
      const res = await superAdminApi.downloadBackup(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${id}.zip`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusy('');
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Backups</h1>
          <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
            Create, verify, restore, and download database backups.
          </p>
        </div>
        <button type="button" className="btn-primary" disabled={busy === 'create'} onClick={onCreate}>
          {busy === 'create' ? 'Creating...' : 'Create backup'}
        </button>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      {backups.length === 0 ? (
        <EmptyState title="No backups" message="Create a manual backup to get started." />
      ) : (
        <div className="space-y-3">
          {backups.map((backup) => {
            const id = backup.id || backup._id;
            return (
              <div key={id} className="panel flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {backup.type} · {backup.status}
                  </p>
                  <p className="text-sm text-ink-700/70 dark:text-sand-100/70">
                    {formatDate(backup.createdAt)} · {formatBytes(backup.sizeBytes)} ·{' '}
                    {backup.verified ? 'Verified' : 'Not verified'}
                  </p>
                  {backup.errorMessage && (
                    <p className="mt-1 text-sm text-red-600">{backup.errorMessage}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-secondary !py-1.5"
                    disabled={Boolean(busy)}
                    onClick={() => onVerify(id)}
                  >
                    {busy === `verify-${id}` ? 'Verifying...' : 'Verify'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5"
                    disabled={Boolean(busy) || backup.status !== 'success'}
                    onClick={() => onDownload(id)}
                  >
                    {busy === `download-${id}` ? 'Downloading...' : 'Download'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary !py-1.5"
                    disabled={Boolean(busy) || backup.status !== 'success'}
                    onClick={() => onRestore(id)}
                  >
                    {busy === `restore-${id}` ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
