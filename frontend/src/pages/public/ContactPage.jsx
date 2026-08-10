import { useInstitution } from '../../store/InstitutionContext';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function ContactPage() {
  const { branding, loading, error } = useInstitution();

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl font-semibold">Contact</h1>
        <p className="mt-2 text-sm text-ink-700/70 dark:text-sand-100/70">
          Reach the institution or the platform developers.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
      <section className="panel space-y-3">
        <h2 className="font-display text-2xl font-semibold">Institution contact</h2>
        <p className="text-sm text-ink-700/70 dark:text-sand-100/70">{branding.institutionName}</p>
        {branding.address ? <p>{branding.address}</p> : <p className="text-sm">Address not configured.</p>}
        {branding.officialEmail ? (
          <p>
            Email:{' '}
            <a className="text-moss-500 underline" href={`mailto:${branding.officialEmail}`}>
              {branding.officialEmail}
            </a>
          </p>
        ) : null}
        {branding.officialPhone ? <p>Phone: {branding.officialPhone}</p> : null}
        {branding.officialWebsite ? (
          <p>
            Website:{' '}
            <a className="text-moss-500 underline" href={branding.officialWebsite} target="_blank" rel="noreferrer">
              {branding.officialWebsite}
            </a>
          </p>
        ) : null}
      </section>

      <section className="panel space-y-3">
        <h2 className="font-display text-2xl font-semibold">Platform developer contact</h2>
        <p className="text-sm text-ink-700/70 dark:text-sand-100/70">
          For platform/technical inquiries (not institutional admissions).
        </p>
        {branding.developerContactEmail ? (
          <p>
            Email:{' '}
            <a className="text-moss-500 underline" href={`mailto:${branding.developerContactEmail}`}>
              {branding.developerContactEmail}
            </a>
          </p>
        ) : (
          <p className="text-sm">Developer email not configured.</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          {branding.developerPortfolioUrl ? (
            <a className="text-moss-500 underline" href={branding.developerPortfolioUrl} target="_blank" rel="noreferrer">
              Portfolio
            </a>
          ) : null}
          {branding.developerGithubUrl ? (
            <a className="text-moss-500 underline" href={branding.developerGithubUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
          ) : null}
          {branding.developerLinkedinUrl ? (
            <a className="text-moss-500 underline" href={branding.developerLinkedinUrl} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : null}
        </div>
      </section>
      </div>
    </div>
  );
}
