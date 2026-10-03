import { resolveApiBaseUrl } from './api';

const PING_MS = 4 * 60 * 1000;

function pingHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  fetch(`${resolveApiBaseUrl()}/health`, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'omit',
    signal: controller.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

export function startKeepApiWarm() {
  pingHealth();
  const id = window.setInterval(pingHealth, PING_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') pingHealth();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
