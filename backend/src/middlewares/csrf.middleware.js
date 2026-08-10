const AppError = require('../utils/AppError');
const { generateCsrfToken, tokensMatch } = require('../security/csrf');
const env = require('../config/env');

function issueCsrfToken(req, res, next) {
  if (!req.cookies?.csrfToken) {
    const token = generateCsrfToken();
    res.cookie('csrfToken', token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: env.cookieSecure,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.locals.csrfToken = token;
  } else {
    res.locals.csrfToken = req.cookies.csrfToken;
  }
  return next();
}

function csrfProtection(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // SPA Bearer auth does not require CSRF; cookie-only sessions do.
  const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
  if (hasBearer) {
    return next();
  }

  // Public auth endpoints issue tokens and are rate-limited separately.
  const path = req.originalUrl || req.path || '';
  const csrfExemptPrefixes = [
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
  ];
  if (csrfExemptPrefixes.some((prefix) => path.startsWith(prefix))) {
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrfToken;

  if (!tokensMatch(cookieToken, headerToken)) {
    return next(new AppError('Invalid CSRF token', 403, 'CSRF_INVALID'));
  }

  return next();
}

module.exports = {
  issueCsrfToken,
  csrfProtection,
};
