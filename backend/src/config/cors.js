const cors = require('cors');
const env = require('./env');
const AppError = require('../utils/AppError');

function normalizeOrigin(value) {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '');
}

function isAllowedOrigin(origin, allowedList) {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  for (const raw of allowedList) {
    const rule = normalizeOrigin(raw);
    if (!rule) continue;

    if (rule === normalized) return true;

    // Support https://*.vercel.app so all Vercel production/preview URLs work.
    if (rule === 'https://*.vercel.app' || rule === '*.vercel.app') {
      try {
        const url = new URL(normalized);
        if (url.protocol === 'https:' && url.hostname.endsWith('.vercel.app')) {
          return true;
        }
      } catch (_) {
        // ignore invalid origin
      }
    }
  }

  return false;
}

function createCorsMiddleware() {
  const allowedList = (env.corsOrigins || []).map(normalizeOrigin).filter(Boolean);

  return cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin, allowedList)) {
        return callback(null, true);
      }

      return callback(
        new AppError(`CORS blocked for origin: ${origin}`, 403, 'CORS_FORBIDDEN')
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-Id',
      'X-CSRF-Token',
    ],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 600,
  });
}

module.exports = { createCorsMiddleware, isAllowedOrigin, normalizeOrigin };
