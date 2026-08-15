const AppError = require('../utils/AppError');
const { generateCsrfToken, tokensMatch } = require('../security/csrf');
const env = require('../config/env');

function issueCsrfToken(req, res, next) {
  if (!req.cookies?.csrfToken) {
    const token = generateCsrfToken();
    res.cookie('csrfToken', token, {
      httpOnly: false,
      sameSite: env.cookieSecure ? 'none' : 'lax',
      secure: env.cookieSecure,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.locals.csrfToken = token;
  } else {
    res.locals.csrfToken = req.cookies.csrfToken;
  }
  return next();
}

function requestPath(req) {
  return String(req.originalUrl || req.url || req.path || '').split('?')[0];
}

function isAuthBootstrapPath(req) {
  const path = requestPath(req);
  const markers = [
    '/auth/login',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/2fa/setup',
    '/auth/2fa/verify',
  ];
  return markers.some((marker) => path === marker || path.endsWith(marker) || path.includes(marker));
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

  // Login / refresh / password / 2FA bootstrap must work from Vercel without CSRF header.
  if (isAuthBootstrapPath(req)) {
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
  isAuthBootstrapPath,
};
