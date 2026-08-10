import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { useInstitution } from '../../store/InstitutionContext';

export default function StudentLayout() {
  const { toggleTheme, theme } = useTheme();
  const { user } = useAuth();
  const { branding, maintenance, refresh } = useInstitution();

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  if (maintenance.enabled && !(user && (user.role === 'admin' || user.role === 'superadmin'))) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="font-display text-3xl font-semibold">{branding.institutionName}</p>
        <p className="mt-4 text-ink-700/80 dark:text-sand-100/80">{maintenance.message}</p>
        <Link to="/login" className="btn-secondary mt-6">
          Staff login
        </Link>
      </div>
    );
  }

  const navLinkClass = ({ isActive }) =>
    `whitespace-nowrap hover:text-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-300 ${
      isActive ? 'text-moss-500' : ''
    }`;

  const footerLinkClass =
    'hover:text-moss-500 focus:outline-none focus:ring-2 focus:ring-moss-300 rounded-sm';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink-700/10 bg-sand-50/80 backdrop-blur dark:border-white/10 dark:bg-ink-950/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 focus:outline-none focus:ring-2 focus:ring-moss-300">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={`${branding.institutionName || 'Institution'} logo`}
                className="h-9 w-9 rounded object-contain"
              />
            ) : null}
            <span className="truncate font-display text-lg font-bold tracking-tight text-moss-500 md:text-xl">
              {branding.institutionName || branding.shortName || '[Institution Name]'}
            </span>
          </Link>
          <nav className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold" aria-label="Primary">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/papers" className={navLinkClass}>
              Question Papers
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
            <NavLink to="/developers" className={navLinkClass}>
              Developers
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact
            </NavLink>
            <button type="button" onClick={toggleTheme} className="btn-secondary !px-3 !py-1.5">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            {user ? (
              <NavLink
                to={user.role === 'superadmin' ? '/superadmin' : '/admin'}
                className="btn-primary !py-1.5"
              >
                Dashboard
              </NavLink>
            ) : (
              <NavLink to="/login" className="btn-primary !py-1.5">
                Login
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-ink-700/10 py-10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 text-center text-sm text-ink-700/70 dark:text-sand-100/60">
          <p className="font-semibold text-ink-900 dark:text-sand-50">
            {branding.institutionName || '[Institution Name]'}
          </p>
          {branding.footerText ? <p>{branding.footerText}</p> : null}

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-semibold" aria-label="Footer">
            <Link to="/" className={footerLinkClass}>
              Home
            </Link>
            <Link to="/papers" className={footerLinkClass}>
              Question Papers
            </Link>
            <Link to="/about" className={footerLinkClass}>
              About
            </Link>
            <Link to="/developers" className={footerLinkClass}>
              Developers
            </Link>
            <Link to="/contact" className={footerLinkClass}>
              Contact
            </Link>
          </nav>

          <p className="text-ink-700/80 dark:text-sand-100/70">
            Designed &amp; Developed by Raj Ahmed &amp; Sahil Haque
          </p>
        </div>
      </footer>
    </div>
  );
}
