import axios from 'axios';

function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3008/api/v1').trim();
  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) return trimmed;
  return `${trimmed}/api/v1`;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 25000,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryGet(error, config) {
  if (!config || String(config.method || 'get').toLowerCase() !== 'get') return false;
  if (error.code === 'ERR_CANCELED') return false;
  if (config.__retryCount >= 2) return false;
  const status = error.response?.status;
  return (
    !error.response ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK'
  );
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('arms_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isAuthCredentialRequest(config) {
  const url = String(config?.url || '');
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (shouldRetryGet(error, original)) {
      original.__retryCount = (original.__retryCount || 0) + 1;
      original.timeout = 45000;
      await sleep(1200 * original.__retryCount);
      return api(original);
    }

    // Never try token refresh on credential/auth bootstrap endpoints.
    // Also do not treat 2FA challenge responses as session-expiry.
    if (
      status === 401 &&
      !original._retry &&
      !isAuthCredentialRequest(original) &&
      code !== 'TWO_FACTOR_REQUIRED' &&
      code !== 'INVALID_TWO_FACTOR'
    ) {
      original._retry = true;
      const refreshToken = localStorage.getItem('arms_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${resolveApiBaseUrl()}/auth/refresh`,
            { refreshToken },
            { withCredentials: true }
          );
          localStorage.setItem('arms_access_token', data.data.accessToken);
          localStorage.setItem('arms_refresh_token', data.data.refreshToken);
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch (_) {
          localStorage.removeItem('arms_access_token');
          localStorage.removeItem('arms_refresh_token');
          localStorage.removeItem('arms_user');
          localStorage.removeItem('arms_must_setup_2fa');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
