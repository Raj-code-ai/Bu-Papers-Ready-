import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function StatusCard({ title, ok, detail }) {
  return (
    <div className="panel">
      <h2 className="font-display text-xl">{title}</h2>
      <p className={`mt-2 text-sm font-semibold ${ok ? 'text-moss-500' : 'text-red-600'}`}>
        {ok ? 'Healthy' : 'Issue detected'}
      </p>
      {detail && <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">{detail}</p>}
    </div>
  );
}

export default function SuperAdminHealthPage() {
  const [health, setHealth] = useState(null);
  const [storage, setStorage] = useState(null);
  const [cloud, setCloud] = useState(null);
  const [cloudError, setCloudError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      superAdminApi.systemHealth(),
      superAdminApi.storageDashboard(),
      superAdminApi.cloudHealth().catch((err) => {
        setCloudError(err.response?.data?.message || err.message);
        return null;
      }),
    ])
      .then(([healthRes, storageRes, cloudRes]) => {
        setHealth(healthRes.data.data);
        setStorage(storageRes.data.data);
        if (cloudRes) setCloud(cloudRes.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">System health</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Database, API, memory, storage usage, and cloud provider status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard
          title="Database"
          ok={health?.database?.ok}
          detail={health?.database?.status || 'unknown'}
        />
        <StatusCard
          title="API"
          ok={health?.api?.ok}
          detail={`Uptime: ${health?.api?.uptimeSec ?? 0}s`}
        />
        <StatusCard
          title="Cloud storage"
          ok={health?.cloud?.ok}
          detail={health?.cloud?.message || health?.cloud?.provider}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel">
          <h2 className="font-display text-xl">Memory</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>RSS: {health?.memory?.rssMb ?? 0} MB</li>
            <li>Heap used: {health?.memory?.heapUsedMb ?? 0} MB</li>
            <li>System free: {health?.memory?.freeSystemMb ?? 0} MB</li>
            <li>System total: {health?.memory?.totalSystemMb ?? 0} MB</li>
          </ul>
        </div>
        <div className="panel">
          <h2 className="font-display text-xl">CPU</h2>
          <ul className="mt-3 space-y-1 text-sm">
            <li>Cores: {health?.cpu?.cores ?? '—'}</li>
            <li>
              Load average:{' '}
              {Array.isArray(health?.cpu?.loadAverage)
                ? health.cpu.loadAverage.map((n) => n.toFixed(2)).join(', ')
                : '—'}
            </li>
            <li>Papers: {health?.totalPapers ?? '—'}</li>
            <li>Active admins: {health?.activeAdmins ?? '—'}</li>
            <li>Unread alerts: {health?.unreadAlerts ?? '—'}</li>
          </ul>
        </div>
      </div>

      <div className="panel">
        <h2 className="font-display text-xl">Storage dashboard</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <p className="text-ink-700/70 dark:text-sand-100/70">Tracked storage</p>
            <p className="font-semibold">{formatBytes(storage?.totalStorageTrackedBytes)}</p>
          </div>
          <div>
            <p className="text-ink-700/70 dark:text-sand-100/70">Cloud provider</p>
            <p className="font-semibold">{storage?.cloudProvider || '—'}</p>
          </div>
          <div>
            <p className="text-ink-700/70 dark:text-sand-100/70">Monthly budget</p>
            <p className="font-semibold">${storage?.monthlyBudgetUsd ?? 0}</p>
          </div>
          <div>
            <p className="text-ink-700/70 dark:text-sand-100/70">Cost estimate</p>
            <p className="font-semibold">${storage?.monthlyCostEstimateUsd ?? 0}</p>
          </div>
        </div>
        {storage?.warnings?.budgetExceeded && (
          <p className="mt-3 text-sm text-red-600">Budget threshold exceeded.</p>
        )}
      </div>

      {cloud ? (
        <div className="panel">
          <h2 className="font-display text-xl">Cloud health</h2>
          <p className="mt-2 text-sm">
            {cloud.ok ? 'Cloud provider is reachable.' : cloud.message || 'Cloud health check failed.'}
          </p>
          {cloud.provider && (
            <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">Provider: {cloud.provider}</p>
          )}
        </div>
      ) : cloudError ? (
        <div className="panel text-sm text-ink-700/70 dark:text-sand-100/70">
          Cloud health unavailable: {cloudError}
        </div>
      ) : null}
    </div>
  );
}
