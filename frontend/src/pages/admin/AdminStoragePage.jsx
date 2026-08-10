import { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminStoragePage() {
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .storage()
      .then((res) => setStorage(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={3} />;
  if (error) return <ErrorState message={error} />;

  const used = storage?.usedBytes || storage?.storageUsedBytes || 0;
  const quota = storage?.quotaBytes || storage?.quota || 0;
  const percent = Math.min(100, Number(storage?.usagePercent || (quota ? (used / quota) * 100 : 0)));
  const near = percent >= 80;
  const full = percent >= 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Storage</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Quota is enforced by the backend. Uploads are blocked when quota is exceeded.
        </p>
      </div>

      <div className="panel space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="font-display text-2xl font-semibold">
            {formatBytes(used)} / {quota ? formatBytes(quota) : 'Unlimited'}
          </p>
          <p className="text-sm">{percent.toFixed(1)}% used</p>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-ink-700/10 dark:bg-white/10" aria-hidden>
          <div
            className={`h-full rounded-full ${full ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-moss-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {near && !full ? (
          <p className="text-sm text-amber-600">Storage is nearing capacity. Consider cleaning the recycle bin.</p>
        ) : null}
        {full ? (
          <p className="text-sm text-red-600">Quota exceeded. New uploads will be blocked until space is freed.</p>
        ) : null}
      </div>
    </div>
  );
}
