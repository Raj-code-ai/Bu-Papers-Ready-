import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('arms_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [mustSetupTwoFactor, setMustSetupTwoFactor] = useState(
    () => localStorage.getItem('arms_must_setup_2fa') === 'true'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('arms_access_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => {
        const nextUser = res.data.data;
        setUser(nextUser);
        localStorage.setItem('arms_user', JSON.stringify(nextUser));
        const needsSetup = Boolean(nextUser.mustSetupTwoFactor);
        setMustSetupTwoFactor(needsSetup);
        localStorage.setItem('arms_must_setup_2fa', needsSetup ? 'true' : 'false');
      })
      .catch(() => {
        setUser(null);
        setMustSetupTwoFactor(false);
        localStorage.removeItem('arms_user');
        localStorage.removeItem('arms_access_token');
        localStorage.removeItem('arms_refresh_token');
        localStorage.removeItem('arms_must_setup_2fa');
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      mustSetupTwoFactor,
      async login(payload) {
        const { data } = await authApi.login(payload);
        const payloadData = data.data;
        localStorage.setItem('arms_access_token', payloadData.accessToken);
        localStorage.setItem('arms_refresh_token', payloadData.refreshToken);
        localStorage.setItem('arms_user', JSON.stringify(payloadData.user));
        const needsSetup = Boolean(payloadData.mustSetupTwoFactor);
        localStorage.setItem('arms_must_setup_2fa', needsSetup ? 'true' : 'false');
        setMustSetupTwoFactor(needsSetup);
        setUser(payloadData.user);
        return payloadData;
      },
      markTwoFactorEnabled() {
        setMustSetupTwoFactor(false);
        localStorage.setItem('arms_must_setup_2fa', 'false');
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, twoFactorEnabled: true };
          localStorage.setItem('arms_user', JSON.stringify(next));
          return next;
        });
      },
      async logout() {
        try {
          await authApi.logout({
            refreshToken: localStorage.getItem('arms_refresh_token'),
          });
        } catch (_) {
          // ignore
        }
        localStorage.removeItem('arms_access_token');
        localStorage.removeItem('arms_refresh_token');
        localStorage.removeItem('arms_user');
        localStorage.removeItem('arms_must_setup_2fa');
        setMustSetupTwoFactor(false);
        setUser(null);
      },
    }),
    [user, loading, mustSetupTwoFactor]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
