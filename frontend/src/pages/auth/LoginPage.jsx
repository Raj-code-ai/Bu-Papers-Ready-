import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useInstitution } from '../../store/InstitutionContext';
import { LoadingSkeleton } from '../../components/common/States';

function mapLoginError(err) {
  const code = err.response?.data?.code;
  const message = err.response?.data?.message;

  switch (code) {
    case 'TWO_FACTOR_REQUIRED':
      return {
        code,
        message: message || 'Enter your authenticator 2FA code to continue.',
        needsOtp: true,
      };
    case 'INVALID_TWO_FACTOR':
      return {
        code,
        message: message || 'Invalid two-factor authentication code.',
        needsOtp: true,
      };
    case 'INVALID_CREDENTIALS':
      return {
        code,
        message: message || 'Invalid email or password.',
        needsOtp: false,
      };
    case 'ACCOUNT_LOCKED':
      return {
        code,
        message: message || 'Account is temporarily locked. Try again later.',
        needsOtp: false,
      };
    case 'ACCOUNT_DISABLED':
      return {
        code,
        message: message || 'Account is disabled.',
        needsOtp: false,
      };
    case 'TWO_FACTOR_SETUP_REQUIRED':
      return {
        code,
        message: message || 'Two-factor setup is required.',
        needsOtp: false,
      };
    default:
      return {
        code: code || 'LOGIN_FAILED',
        message: message || err.message || 'Login failed.',
        needsOtp: false,
      };
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const { branding, ready } = useInstitution();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', twoFactorCode: '' });
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setErrorCode('');
    try {
      const data = await login({
        email: form.email.trim(),
        password: form.password,
        twoFactorCode: form.twoFactorCode || undefined,
      });

      if (data.mustSetupTwoFactor) {
        navigate('/setup-2fa');
        return;
      }

      if (data.user.role === 'superadmin') navigate('/superadmin');
      else navigate('/admin');
    } catch (err) {
      const mapped = mapLoginError(err);
      setError(mapped.message);
      setErrorCode(mapped.code);
      if (mapped.needsOtp) setShowOtp(true);
    } finally {
      setLoading(false);
    }
  }

  const brandLabel = branding.institutionName || branding.siteName || branding.shortName || '';

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <form onSubmit={onSubmit} className="panel space-y-4">
        <div>
          <Link to="/" className="font-display text-2xl font-bold text-moss-500">
            {brandLabel || 'Staff login'}
          </Link>
          <h1 className="mt-3 font-display text-2xl font-semibold">Staff login</h1>
          <p className="mt-1 text-sm text-ink-700/70 dark:text-sand-100/70">
            Admins and Super Admins only. Students never need an account.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-error-code={errorCode}>
            {error}
          </p>
        )}

        <label className="block text-sm">
          Email
          <input
            className="input mt-1"
            type="email"
            required
            autoComplete="username"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="input mt-1"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </label>

        {(showOtp || errorCode === 'TWO_FACTOR_REQUIRED' || errorCode === 'INVALID_TWO_FACTOR' || form.twoFactorCode) && (
          <label className="block text-sm">
            2FA code
            <input
              className="input mt-1"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={form.twoFactorCode}
              onChange={(e) => setForm((f) => ({ ...f, twoFactorCode: e.target.value }))}
              placeholder="Dev code: 123456"
            />
          </label>
        )}

        <button className="btn-primary w-full" disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
