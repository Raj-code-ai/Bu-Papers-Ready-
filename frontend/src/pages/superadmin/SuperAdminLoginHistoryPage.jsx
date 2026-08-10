import { useEffect, useState } from 'react';
import { superAdminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function SuperAdminLoginHistoryPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    superAdminApi
      .loginHistory({ page, limit: 25 })
      .then((res) => {
        setItems(res.data.data || []);
        setMeta(res.data.meta || { page: 1, totalPages: 1 });
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [page]);

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Login history</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Recent sign-in attempts across Admin and Super Admin accounts.
        </p>
      </div>
      {error && <ErrorState message={error} />}

      {items.length === 0 ? (
        <EmptyState title="No login events" message="Login attempts will appear here." />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-700/10 dark:border-white/10">
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Result</th>
                <th className="py-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id} className="border-b border-ink-700/5 dark:border-white/5">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="py-2 pr-4">{row.email}</td>
                  <td className="py-2 pr-4">{row.role || '—'}</td>
                  <td className="py-2 pr-4">{row.success ? 'Success' : 'Failed'}</td>
                  <td className="py-2">{row.ip || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-secondary !py-1.5"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm">
            Page {meta.page || page} of {meta.totalPages}
          </span>
          <button
            type="button"
            className="btn-secondary !py-1.5"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
