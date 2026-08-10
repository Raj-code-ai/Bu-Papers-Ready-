import { useEffect, useState } from 'react';
import { useInstitution } from '../../store/InstitutionContext';

const FALLBACK_DEVELOPERS = [
  {
    id: 'raj-ahmed',
    name: 'Raj Ahmed',
    role: 'Creator | Developer',
    photoUrl: '',
    education: 'Bhattadev University, Bajali',
    semester: '',
    department: 'Computer Science and Engineering',
    bio: 'Raj Ahmed is a Computer Science and Engineering student interested in software development, web technologies, and building practical digital solutions.',
  },
  {
    id: 'sahil-haque',
    name: 'Sahil Haque',
    role: 'Creator',
    photoUrl: '',
    education: 'Bhattadev University, Bajali',
    semester: '',
    department: 'Mathematics Department',
    bio: 'Sahil Haque is a Mathematics student who contributed to the creation and development of this platform.',
  },
];

function DeveloperPhoto({ src, alt, initials }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className="flex aspect-square w-36 items-center justify-center rounded-2xl border border-dashed border-ink-700/20 bg-moss-500/10 text-center dark:border-white/15 sm:w-40"
        role="img"
        aria-label={alt}
      >
        <div>
          <p className="font-display text-3xl font-semibold text-moss-500">{initials}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-ink-700/50 dark:text-sand-100/50">Photo</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={160}
      height={160}
      className="aspect-square w-36 rounded-2xl object-cover shadow-soft transition duration-300 group-hover:scale-[1.02] sm:w-40"
      onError={() => setFailed(true)}
    />
  );
}

function DeveloperCard({ developer }) {
  const initials = (developer.name || 'D')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  const links = [];
  if (developer.github) links.push({ label: 'GitHub', href: developer.github });
  if (developer.linkedin) links.push({ label: 'LinkedIn', href: developer.linkedin });
  if (developer.portfolio) links.push({ label: 'Portfolio', href: developer.portfolio });

  return (
    <article className="reveal-up group panel flex flex-col items-center text-center transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <DeveloperPhoto
        src={developer.photoUrl}
        alt={`${developer.name} — ${developer.role || 'Developer'}`}
        initials={initials}
      />

      <h2 className="mt-5 font-display text-2xl font-semibold">{developer.name}</h2>
      <p className="mt-1 text-sm font-semibold text-moss-500">{developer.role}</p>

      <ul className="mt-5 w-full space-y-2 text-left text-sm text-ink-700/80 dark:text-sand-100/80">
        {developer.education ? (
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-moss-500" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z"
                />
              </svg>
            </span>
            <span>
              <span className="sr-only">Education: </span>
              {developer.education}
            </span>
          </li>
        ) : null}
        {developer.semester ? (
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-moss-500" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
                />
              </svg>
            </span>
            <span>
              <span className="sr-only">Class / semester: </span>
              {developer.semester}
            </span>
          </li>
        ) : null}
        {developer.department ? (
          <li className="flex gap-2">
            <span className="mt-0.5 shrink-0 text-moss-500" aria-hidden>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path strokeLinecap="round" d="M8 20h8M12 18v2" />
              </svg>
            </span>
            <span>
              <span className="sr-only">Department: </span>
              {developer.department}
            </span>
          </li>
        ) : null}
      </ul>

      {developer.bio ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-700/75 dark:text-sand-100/75">{developer.bio}</p>
      ) : null}

      {links.length ? (
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-sm">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-moss-500 underline focus:outline-none focus:ring-2 focus:ring-moss-300"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function DevelopersPage() {
  const { branding } = useInstitution();
  const institutionName = branding.institutionName || '[Institution Name]';
  const developers =
    branding.developers && branding.developers.length > 0
      ? branding.developers
      : FALLBACK_DEVELOPERS;

  useEffect(() => {
    document.title = `Developers | ${institutionName}`;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = 'Meet the creators and developers behind the platform.';
  }, [institutionName]);

  return (
    <div className="space-y-10">
      <header className="reveal-up mx-auto max-w-2xl text-center">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Meet the Developers</h1>
        <p className="mt-3 text-base text-ink-700/75 dark:text-sand-100/75">
          The creators and developers behind this platform.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {developers.map((developer) => (
          <DeveloperCard key={developer.id || developer.name} developer={developer} />
        ))}
      </div>
    </div>
  );
}
