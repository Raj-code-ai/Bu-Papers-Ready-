import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

function formatBytes(bytes = 0) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.storage()])
      .then(([dash, store]) => {
        setData(dash.data.data);
        setStorage(store.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorState message={error} />;

  const used = storage?.usedBytes || storage?.storageUsedBytes || 0;
  const quota = storage?.quotaBytes || 0;
  const percent = Math.min(100, Number(storage?.usagePercent || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Admin dashboard</h1>
          <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
            Academic content: upload, draft, publish, recycle bin, and storage.
          </p>
        </div>
        <Link to="/admin/upload" className="btn-primary">
          Upload paper
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Uploads', data?.uploadCount || 0],
          ['Views', data?.totalViews || 0],
          ['Downloads', data?.totalDownloads || 0],
          ['Storage', `${percent}%`],
        ].map(([label, value]) => (
          <div key={label} className="panel">
            <p className="text-sm text-ink-700/70 dark:text-sand-100/70">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="panel space-y-3">
        <div className="flex justify-between text-sm">
          <span>Storage usage</span>
          <span>
            {formatBytes(used)} / {quota ? formatBytes(quota) : '—'}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-ink-700/10 dark:bg-white/10">
          <div className="h-full rounded-full bg-moss-500" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link to="/admin/drafts" className="btn-secondary !py-1.5">
            Drafts
          </Link>
          <Link to="/admin/published" className="btn-secondary !py-1.5">
            Published
          </Link>
          <Link to="/admin/recycle-bin" className="btn-secondary !py-1.5">
            Recycle bin
          </Link>
          <Link to="/admin/storage" className="btn-secondary !py-1.5">
            Storage details
          </Link>
        </div>
      </div>
    </div>
  );
}
