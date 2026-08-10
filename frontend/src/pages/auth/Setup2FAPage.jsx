import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/endpoints';
import { useAuth } from '../../store/AuthContext';
import { ErrorState, LoadingSkeleton } from '../../components/common/States';

export default function Setup2FAPage() {
  const { user, mustSetupTwoFactor, markTwoFactorEnabled, logout } = useAuth();
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authApi
      .setup2fa()
      .then((res) => {
        if (!cancelled) setSetup(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/admin" replace />;
  if (!mustSetupTwoFactor && user.twoFactorEnabled) return <Navigate to="/superadmin" replace />;

  async function onVerify(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await authApi.verify2fa({ token });
      markTwoFactorEnabled();
      navigate('/superadmin');
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'INVALID_TWO_FACTOR') {
        setError(err.response?.data?.message || 'Invalid two-factor authentication code.');
      } else {
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
      <div className="panel space-y-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Set up Super Admin 2FA</h1>
          <p className="mt-2 text-sm text-ink-700/70 dark:text-sand-100/70">
            Password login succeeded. Enable authenticator 2FA before accessing the dashboard.
            For now in development, enter <span className="font-semibold">123456</span> to continue.
          </p>
        </div>

        {loading && <LoadingSkeleton rows={3} />}
        {error && <ErrorState message={error} />}

        {!loading && setup && (
          <>
            <div className="flex justify-center">
              <img src={setup.qrCodeDataUrl} alt="2FA QR code" className="rounded-md bg-white p-2" />
            </div>
            <p className="break-all text-xs text-ink-700/70 dark:text-sand-100/70">
              Manual secret: {setup.secret}
            </p>
            <form onSubmit={onVerify} className="space-y-3">
              <label className="block text-sm">
                Enter code from authenticator
                <input
                  className="input mt-1"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  inputMode="numeric"
                  required
                  placeholder="Dev code: 123456"
                />
              </label>
              <button className="btn-primary w-full" type="submit" disabled={saving}>
                {saving ? 'Verifying...' : 'Enable 2FA and continue'}
              </button>
            </form>
          </>
        )}

        <button type="button" className="btn-secondary w-full" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
