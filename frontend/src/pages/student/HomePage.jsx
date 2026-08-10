import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../../services/endpoints';
import { useInstitution } from '../../store/InstitutionContext';
import { EmptyState, ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function HomePage() {
  const navigate = useNavigate();
  const { branding } = useInstitution();
  const [stats, setStats] = useState(null);
  const [latest, setLatest] = useState([]);
  const [popular, setPopular] = useState([]);
  const [taxonomy, setTaxonomy] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    Promise.all([publicApi.stats(), publicApi.latest(6), publicApi.popular(6), publicApi.taxonomy()])
      .then(([statsRes, latestRes, popularRes, taxRes]) => {
        setStats(statsRes.data.data);
        setLatest(latestRes.data.data || []);
        setPopular(popularRes.data.data || []);
        setTaxonomy(taxRes.data.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load question papers right now. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12">
      <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
        <div
          className="relative min-h-[68vh] px-4 py-20 text-sand-50"
          style={{
            background: `linear-gradient(135deg, ${branding.secondaryColor || '#0b2424'} 0%, ${branding.primaryColor || '#0f766e'} 100%)`,
          }}
        >
          <div className="relative mx-auto flex max-w-6xl flex-col justify-end gap-5 pt-10">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-14 w-14 rounded bg-white/10 object-contain p-1" />
              ) : null}
              <p className="font-display text-4xl font-bold tracking-tight md:text-6xl">
                {branding.institutionName}
              </p>
            </div>
            <h1 className="max-w-2xl font-display text-2xl font-semibold md:text-3xl">
              {branding.tagline}
            </h1>
            <p className="max-w-xl text-base text-sand-100/85">
              Search and download published question papers for your department, programme, semester, and subject.
            </p>
            <form
              className="mt-2 flex w-full max-w-xl flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/papers?q=${encodeURIComponent(searchQ.trim())}`);
              }}
            >
              <input
                className="input min-w-0 flex-1 border-white/20 bg-white/10 text-sand-50 placeholder:text-sand-100/60"
                placeholder="Search question papers..."
                aria-label="Search question papers"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <button type="submit" className="btn-primary bg-sand-50 text-ink-900 hover:bg-white">
                Search
              </button>
            </form>
            <div className="flex flex-wrap gap-3">
              <Link to="/papers" className="btn-primary bg-sand-50 text-ink-900 hover:bg-white">
                Browse question papers
              </Link>
              <Link to="/about" className="btn-secondary border-white/20 bg-white/10 text-sand-50 hover:bg-white/20">
                About institution
              </Link>
            </div>
          </div>
        </div>
      </section>

      {loading && <LoadingSkeleton rows={4} />}
      {error && <ErrorState message={error} />}

      {!loading && !error && (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              ['Total Papers', stats?.totalPapers || 0],
              ['Total Downloads', stats?.totalDownloads || 0],
              ['Total Views', stats?.totalViews || 0],
            ].map(([label, value]) => (
              <div key={label} className="panel">
                <p className="text-sm text-ink-700/70 dark:text-sand-100/70">{label}</p>
                <p className="mt-2 font-display text-3xl font-bold">{value}</p>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-2xl font-semibold">Academic categories</h2>
            <div className="flex flex-wrap gap-2">
              {(taxonomy?.departments || []).slice(0, 12).map((item) => (
                <Link
                  key={item._id}
                  to={`/papers?departmentId=${item._id}`}
                  className="rounded-md border border-ink-700/10 bg-white/70 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-ink-800"
                >
                  {item.name}
                </Link>
              ))}
              {!(taxonomy?.departments || []).length ? (
                <p className="text-sm text-ink-700/70">Categories will appear when Super Admin configures taxonomy.</p>
              ) : null}
            </div>
          </section>

          <section id="latest" className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">Latest papers</h2>
            {latest.length === 0 ? (
              <EmptyState title="No papers yet" message="Published papers will appear here." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {latest.map((paper) => (
                  <Link key={paper._id} to={`/papers/${paper._id}`} className="panel transition hover:-translate-y-0.5">
                    <p className="font-semibold">{paper.title}</p>
                    <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
                      {paper.subjectId?.name || paper.resourceTypeId?.name || 'Question paper'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-2xl font-semibold">Popular papers</h2>
            {popular.length === 0 ? (
              <EmptyState title="No popularity data yet" message="Downloads and views will rank papers here." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {popular.map((paper) => (
                  <Link key={paper._id} to={`/papers/${paper._id}`} className="panel transition hover:-translate-y-0.5">
                    <p className="font-semibold">{paper.title}</p>
                    <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
                      {paper.downloadCount || 0} downloads · {paper.viewCount || 0} views
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
