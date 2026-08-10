import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { superAdminApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function SuperAdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [overview, setOverview] = useState(null);
  const [storage, setStorage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      superAdminApi.dashboard(),
      superAdminApi.systemHealth(),
      superAdminApi.reportsOverview(),
      superAdminApi.storageDashboard(),
    ])
      .then(([dash, healthRes, overviewRes, storageRes]) => {
        setDashboard(dash.data.data);
        setHealth(healthRes.data.data);
        setOverview(overviewRes.data.data);
        setStorage(storageRes.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">System overview</h1>
          <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
            Institution-wide papers, health, storage, and admin status.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/superadmin/institution" className="btn-secondary">
            Institution settings
          </Link>
          <Link to="/superadmin/admins" className="btn-primary">
            Manage admins
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Papers', dashboard?.totalPapers || overview?.totalPapers || 0],
          ['Downloads', dashboard?.totalDownloads || overview?.totalDownloads || 0],
          ['Views', dashboard?.totalViews || overview?.totalViews || 0],
          ['Admins', dashboard?.totalAdmins || 0],
        ].map(([label, value]) => (
          <div key={label} className="panel">
            <p className="text-sm text-ink-700/70 dark:text-sand-100/70">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel">
          <h2 className="font-display text-xl">Database</h2>
          <p className="mt-2 text-sm">{health?.database?.status || 'unknown'}</p>
        </div>
        <div className="panel">
          <h2 className="font-display text-xl">Cloud</h2>
          <p className="mt-2 text-sm">
            {health?.cloud?.ok ? 'Healthy' : health?.cloud?.message || 'Unavailable'}
          </p>
        </div>
        <div className="panel">
          <h2 className="font-display text-xl">Storage tracked</h2>
          <p className="mt-2 text-sm">
            {Math.round((storage?.totalStorageTrackedBytes || 0) / (1024 * 1024))} MB
          </p>
        </div>
      </div>
    </div>
  );
}
