const rateLimit = require('express-rate-limit');
const env = require('./env');

function createGlobalRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMaxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    },
  });
}

function createAuthRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    },
  });
}

function createUploadRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.uploadRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many upload attempts. Please try again later.',
      code: 'TOO_MANY_REQUESTS',
    },
  });
}

module.exports = {
  createGlobalRateLimiter,
  createAuthRateLimiter,
  createUploadRateLimiter,
};
