import { useEffect, useState } from 'react';
import { adminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function AdminRecycleBinPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.recycleBin();
      setPapers(res.data.data || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Recycle bin</h1>
        <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
          Restore papers or permanently delete them after review.
        </p>
      </div>
      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} onRetry={load} />}

      {papers.length === 0 ? (
        <EmptyState title="Recycle bin is empty" message="Deleted papers will appear here." />
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <div key={paper._id} className="panel flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{paper.title}</p>
                <p className="text-sm text-ink-700/70">
                  {paper.subjectId?.name} · deleted {paper.deletedAt ? new Date(paper.deletedAt).toLocaleString() : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary !py-1.5"
                  onClick={async () => {
                    await adminApi.restore(paper._id);
                    setMessage('Paper restored.');
                    await load();
                  }}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="btn-secondary !py-1.5"
                  onClick={async () => {
                    if (!window.confirm('Permanently delete this paper? This cannot be undone.')) return;
                    await adminApi.permanentDelete(paper._id);
                    setMessage('Paper permanently deleted.');
                    await load();
                  }}
                >
                  Delete forever
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
