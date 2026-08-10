const cors = require('cors');
const env = require('./env');
const AppError = require('../utils/AppError');

function createCorsMiddleware() {
  const allowed = new Set(env.corsOrigins);

  return cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowed.has(origin)) {
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

module.exports = { createCorsMiddleware };
