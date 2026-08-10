import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/endpoints';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

function metaLine(paper) {
  return [
    paper.programmeId?.name,
    paper.semesterId?.name || paper.classNodeId?.name,
    paper.subjectId?.name,
    paper.paperTypeId?.name || paper.resourceTypeId?.name,
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function AdminPapersPage({ statusFilter = '', title = 'Manage papers' }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmPublish, setConfirmPublish] = useState(null);
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = {};
    if (statusFilter) params.status = statusFilter;
    return adminApi
      .papers(params)
      .then((res) => setPapers(res.data.data || []))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function doPublish(paper) {
    setBusyId(paper._id);
    setMessage('');
    try {
      await adminApi.publish(paper._id);
      setMessage(`Published: ${paper.title}`);
      setConfirmPublish(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId('');
    }
  }

  async function doUnpublish(paper) {
    setBusyId(paper._id);
    try {
      await adminApi.unpublish(paper._id);
      setMessage(`Moved to draft: ${paper.title}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId('');
    }
  }

  async function doDelete(paper) {
    if (!window.confirm(`Move "${paper.title}" to recycle bin?`)) return;
    setBusyId(paper._id);
    try {
      await adminApi.softDelete(paper._id);
      setMessage('Paper moved to recycle bin.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error && !papers.length) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
            Draft → review metadata → publish. Deleted papers go to the recycle bin.
          </p>
        </div>
        <Link to="/admin/upload" className="btn-primary">
          Upload
        </Link>
      </div>

      {message && <p className="panel text-moss-500">{message}</p>}
      {error && <ErrorState message={error} />}

      {papers.length === 0 ? (
        <EmptyState title="No papers here" message="Upload a PDF or adjust the status filter." />
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <div key={paper._id} className="panel space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{paper.title}</p>
                  <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">{metaLine(paper)}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink-700/60">
                    {paper.status} · {paper.viewCount || 0} views · {paper.downloadCount || 0} downloads
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {paper.status !== 'published' ? (
                    <button
                      type="button"
                      className="btn-primary !py-1.5"
                      disabled={busyId === paper._id}
                      onClick={() => setConfirmPublish(paper)}
                    >
                      Publish
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary !py-1.5"
                      disabled={busyId === paper._id}
                      onClick={() => doUnpublish(paper)}
                    >
                      Unpublish
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-secondary !py-1.5"
                    disabled={busyId === paper._id}
                    onClick={() => doDelete(paper)}
                  >
                    Delete
                  </button>
                  {paper.status === 'published' ? (
                    <Link to={`/papers/${paper._id}`} className="btn-secondary !py-1.5">
                      View public
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmPublish ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4" role="dialog" aria-modal="true">
          <div className="panel max-w-md space-y-4">
            <h2 className="font-display text-xl font-semibold">Confirm publish</h2>
            <p className="text-sm text-ink-700/80 dark:text-sand-100/80">You are about to publish:</p>
            <ul className="space-y-1 text-sm">
              <li className="font-semibold">{confirmPublish.title}</li>
              <li>{confirmPublish.programmeId?.name || 'Programme'}</li>
              <li>{confirmPublish.semesterId?.name || confirmPublish.classNodeId?.name || 'Semester/Class'}</li>
              <li>{confirmPublish.subjectId?.name || 'Subject'}</li>
              <li>{confirmPublish.paperTypeId?.name || confirmPublish.resourceTypeId?.name || 'Examination type'}</li>
            </ul>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmPublish(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busyId === confirmPublish._id}
                onClick={() => doPublish(confirmPublish)}
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
