import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';
import { fetchPublicPaper } from '../../utils/paperRequest';
import { findCachedPaper, writePaperDetailCache } from '../../utils/publicCache';

function MetaItem({ label, value }) {
  return (
    <div>
      <dt className="text-ink-700/60 dark:text-sand-100/60">{label}</dt>
      <dd className="font-semibold">{value || '—'}</dd>
    </div>
  );
}

export default function PaperDetailPage() {
  const { id } = useParams();
  const cached = findCachedPaper(id);
  const [paper, setPaper] = useState(cached);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    const preview = findCachedPaper(id);
    if (preview) {
      setPaper(preview);
      setLoading(false);
    } else {
      setPaper(null);
      setLoading(true);
    }
    setError('');

    let cancelled = false;
    fetchPublicPaper(id)
      .then((res) => {
        if (cancelled) return;
        const next = res.data?.data;
        if (!next) {
          if (!preview) setError('Unable to load this paper.');
          return;
        }
        setPaper(next);
        writePaperDetailCache(next);
        setError('');
      })
      .catch((err) => {
        if (cancelled) return;
        if (!preview) {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleView() {
    const { data } = await publicApi.view(id);
    window.open(data.data.viewUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleDownload() {
    const { data } = await publicApi.download(id);
    window.open(data.data.downloadUrl, '_blank', 'noopener,noreferrer');
  }

  if (loading && !paper) return <LoadingSkeleton rows={4} />;
  if (error && !paper) return <ErrorState message={error} />;
  if (!paper) return <ErrorState message="This paper is not available." />;

  return (
    <article className="panel space-y-5">
      {loading ? <LoadingSkeleton rows={1} /> : null}
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
        <MetaItem label="Subject" value={paper.subjectId?.name} />
        <MetaItem label="Semester" value={paper.semesterId?.name} />
        <MetaItem label="Year" value={paper.academicYearId?.name} />
        <MetaItem label="Department" value={paper.departmentId?.name} />
        <MetaItem label="Programme" value={paper.programmeId?.name} />
        <MetaItem label="Paper type" value={paper.paperTypeId?.name} />
        <MetaItem label="Views" value={paper.viewCount || 0} />
        <MetaItem label="Downloads" value={paper.downloadCount || 0} />
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
