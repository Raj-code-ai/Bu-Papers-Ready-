import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useInstitution } from '../../store/InstitutionContext';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

const WHY_CARDS = [
  {
    title: 'Easy Access',
    body: 'Students can quickly find question papers without searching through multiple sources.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 7v12a1 1 0 001 1h12a1 1 0 001-1V7M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2" />
      </svg>
    ),
  },
  {
    title: 'Organized Resources',
    body: 'Question papers are organized by academic level, class or programme, subject, and examination type.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    ),
  },
  {
    title: 'Quick Search',
    body: 'Students can search and filter papers to find the resource they need efficiently.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
      </svg>
    ),
  },
  {
    title: 'Accessible Anywhere',
    body: 'The platform is responsive and can be accessed from desktop, tablet, and mobile devices.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path strokeLinecap="round" d="M11 18h2" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Search',
    body: 'Find the subject, semester, or examination paper.',
  },
  {
    n: '02',
    title: 'View',
    body: 'Open the available paper and check its information.',
  },
  {
    n: '03',
    title: 'Download',
    body: 'Download the required question paper for study and revision.',
  },
];

export default function AboutPage() {
  const { branding, loading, error } = useInstitution();
  const institutionName = branding.institutionName || '[Institution Name]';

  useEffect(() => {
    document.title = `About | ${institutionName}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content =
      'Learn about the academic question-paper platform and its purpose.';
  }, [institutionName]);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-12 md:space-y-16">
      <header className="reveal-up relative overflow-hidden rounded-2xl border border-ink-700/10 bg-gradient-to-br from-moss-500/15 via-white/70 to-sand-100 p-8 dark:border-white/10 dark:from-moss-500/20 dark:via-ink-800/80 dark:to-ink-950 md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wide text-moss-500">About {institutionName}</p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold text-ink-900 dark:text-sand-50 md:text-4xl">
          About Our Platform
        </h1>
        <p className="mt-4 max-w-2xl text-base text-ink-700/80 dark:text-sand-100/80 md:text-lg">
          A simple and organized platform for accessing academic question papers and examination resources.
        </p>
        {branding.aboutText ? (
          <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-ink-700/75 dark:text-sand-100/75 md:text-base">
            {branding.aboutText}
          </p>
        ) : (
          <>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-700/75 dark:text-sand-100/75 md:text-base">
              This platform is designed to provide students with a simple, organized, and convenient way to
              access previous examination question papers and other academic resources.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700/75 dark:text-sand-100/75 md:text-base">
              Instead of searching through scattered files, students can browse, search, and download available
              papers from one centralized platform.
            </p>
          </>
        )}
        <div className="mt-8">
          <Link to="/papers" className="btn-primary">
            Browse question papers
          </Link>
        </div>
      </header>

      <section aria-labelledby="why-heading" className="space-y-6">
        <div className="reveal-up">
          <h2 id="why-heading" className="font-display text-2xl font-semibold md:text-3xl">
            Why This Platform?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-700/70 dark:text-sand-100/70">
            Built for clarity — find papers without the noise.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {WHY_CARDS.map((card, i) => (
            <article
              key={card.title}
              className="reveal-up panel transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-moss-500/10 text-moss-500">
                {card.icon}
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700/75 dark:text-sand-100/75">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="vision-heading"
        className="reveal-up rounded-2xl border border-moss-500/20 bg-ink-900 px-6 py-10 text-sand-50 md:px-10 md:py-12"
      >
        <h2 id="vision-heading" className="font-display text-2xl font-semibold md:text-3xl">
          Our Vision
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-sand-100/85 md:text-lg">
          Our vision is to make academic resources easier to access, better organized, and more useful for
          students.
        </p>
      </section>

      <section aria-labelledby="how-heading" className="space-y-6">
        <div className="reveal-up">
          <h2 id="how-heading" className="font-display text-2xl font-semibold md:text-3xl">
            How It Works
          </h2>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-sand-100/70">Three simple steps.</p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.n} className="reveal-up relative">
              <article className="panel flex h-full flex-col">
                <p className="font-display text-3xl font-bold text-moss-500">{step.n}</p>
                <h3 className="mt-2 font-display text-xl font-semibold uppercase tracking-wide">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700/75 dark:text-sand-100/75">{step.body}</p>
              </article>
              {index < STEPS.length - 1 ? (
                <span
                  className="pointer-events-none absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-moss-500 md:block"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
