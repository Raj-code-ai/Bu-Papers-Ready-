import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useInstitution } from '../../store/InstitutionContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { branding } = useInstitution();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-ink-700/10 bg-ink-900 p-5 text-sand-50 md:min-h-screen md:border-b-0 md:border-r md:border-white/10">
        <p className="font-display text-2xl">{branding.shortName || 'Admin'}</p>
        <p className="mt-1 text-sm text-sand-100/70">Paper management</p>
        <p className="mt-1 truncate text-xs text-sand-100/50">{user?.email}</p>
        <nav className="mt-8 flex flex-col gap-2 text-sm font-semibold">
          <NavLink to="/admin" end className="rounded-md px-3 py-2 hover:bg-white/10">
            Dashboard
          </NavLink>
          <NavLink to="/admin/upload" className="rounded-md px-3 py-2 hover:bg-white/10">
            Upload Papers
          </NavLink>
          <NavLink to="/admin/papers" className="rounded-md px-3 py-2 hover:bg-white/10">
            Manage Papers
          </NavLink>
          <NavLink to="/admin/drafts" className="rounded-md px-3 py-2 hover:bg-white/10">
            Drafts
          </NavLink>
          <NavLink to="/admin/published" className="rounded-md px-3 py-2 hover:bg-white/10">
            Published
          </NavLink>
          <NavLink to="/admin/recycle-bin" className="rounded-md px-3 py-2 hover:bg-white/10">
            Recycle Bin
          </NavLink>
          <NavLink to="/admin/storage" className="rounded-md px-3 py-2 hover:bg-white/10">
            Storage
          </NavLink>
          <NavLink to="/" className="rounded-md px-3 py-2 hover:bg-white/10">
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
