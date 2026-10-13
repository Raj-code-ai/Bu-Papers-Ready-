import { publicApi } from '../services/endpoints';

const inflight = new Map();

export function fetchPublicPaper(id) {
  const key = String(id || '');
  if (!key) return Promise.reject(new Error('Missing paper id'));
  const existing = inflight.get(key);
  if (existing) return existing;
  const request = publicApi.paper(key).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return request;
}
