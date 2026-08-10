import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function ProtectedRoute({ children, roles = [], allowTwoFactorSetup = false }) {
  const { user, loading, mustSetupTwoFactor } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="skeleton h-10 w-40" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(user.role)) return <Navigate to="/403" replace />;

  if (mustSetupTwoFactor && user.role === 'superadmin' && !allowTwoFactorSetup) {
    return <Navigate to="/setup-2fa" replace />;
  }

  return children;
}
