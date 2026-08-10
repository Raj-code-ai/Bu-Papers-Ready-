import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 hover:bg-white/10${isActive ? ' bg-white/10' : ''}`;

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/10 bg-ink-950 p-5 text-sand-50 md:min-h-screen md:border-b-0 md:border-r">
        <p className="font-display text-2xl">Super Admin</p>
        <p className="mt-1 text-sm text-sand-100/70">{user?.email}</p>
        <nav className="mt-8 flex flex-col gap-1 text-sm font-semibold">
          <NavLink to="/superadmin" end className={navLinkClass}>
            Overview
          </NavLink>
          <NavLink to="/superadmin/academic" className={navLinkClass}>
            Academic Structure
          </NavLink>
          <NavLink to="/superadmin/admins" className={navLinkClass}>
            Admins
          </NavLink>
          <NavLink to="/superadmin/institution" className={navLinkClass}>
            Institution
          </NavLink>
          <NavLink to="/superadmin/developers" className={navLinkClass}>
            Developers
          </NavLink>
          <NavLink to="/superadmin/storage-policy" className={navLinkClass}>
            Storage Policy
          </NavLink>
          <NavLink to="/superadmin/security" className={navLinkClass}>
            Security
          </NavLink>
          <NavLink to="/superadmin/features" className={navLinkClass}>
            Features
          </NavLink>
          <NavLink to="/superadmin/audit-logs" className={navLinkClass}>
            Audit Logs
          </NavLink>
          <NavLink to="/superadmin/login-history" className={navLinkClass}>
            Login History
          </NavLink>
          <NavLink to="/superadmin/backups" className={navLinkClass}>
            Backups
          </NavLink>
          <NavLink to="/superadmin/health" className={navLinkClass}>
            System Health
          </NavLink>
          <NavLink to="/superadmin/system" className={navLinkClass}>
            System / Maintenance
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            Paper tools
          </NavLink>
          <NavLink to="/" className={navLinkClass}>
            Public site
          </NavLink>
          <button type="button" onClick={logout} className="rounded-md px-3 py-2 text-left hover:bg-white/10">
            Logout
          </button>
        </nav>
      </aside>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
