import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function PaperDetailPage() {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi
      .paper(id)
      .then((res) => setPaper(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleView() {
    const { data } = await publicApi.view(id);
    window.open(data.data.viewUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDownload() {
    const { data } = await publicApi.download(id);
    window.open(data.data.downloadUrl, '_blank', 'noopener,noreferrer');
  }

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorState message={error} />;
  if (!paper) return null;

  return (
    <article className="panel space-y-5">
      <div>
        <p className="text-sm uppercase tracking-wide text-moss-500">
          {paper.resourceTypeId?.name || 'Resource'}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">{paper.title}</h1>
        <p className="mt-3 text-ink-700/80 dark:text-sand-100/80">
          {paper.description || 'No description provided.'}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-ink-700/60 dark:text-sand-100/60">Subject</dt>
          <dd className="font-semibold">{paper.subjectId?.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-700/60 dark:text-sand-100/60">Views</dt>
          <dd className="font-semibold">{paper.viewCount || 0}</dd>
        </div>
        <div>
          <dt className="text-ink-700/60 dark:text-sand-100/60">Downloads</dt>
          <dd className="font-semibold">{paper.downloadCount || 0}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={handleView}>
          View PDF
        </button>
        <button type="button" className="btn-secondary" onClick={handleDownload}>
          Download PDF
        </button>
      </div>
    </article>
  );
}
