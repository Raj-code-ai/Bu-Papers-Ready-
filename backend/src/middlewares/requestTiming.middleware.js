const logger = require('../config/logger');
const { getDatabaseStatus } = require('../config/db');

function requestTimingMiddleware(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    const path = String(req.originalUrl || req.url || '').split('?')[0];
    if (path.includes('/health')) return;

    const durationMs = Date.now() - started;
    const db = getDatabaseStatus();
    const payload = {
      requestId: req.requestId,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs,
      dbStatus: db.status,
      processUptimeSec: Math.round(process.uptime()),
    };

    if (durationMs >= 300) {
      logger.info('http.request.slow', payload);
    } else {
      logger.debug('http.request', payload);
    }
  });
  next();
}

module.exports = requestTimingMiddleware;
