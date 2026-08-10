const crypto = require('crypto');
const env = require('../config/env');

/**
 * Double-submit CSRF token helpers for cookie-authenticated mutating requests.
 * Bearer-token API clients are exempted by middleware.
 */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashCsrfToken(token) {
  return crypto.createHmac('sha256', env.csrfSecret).update(token).digest('hex');
}

function tokensMatch(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(String(cookieToken));
  const b = Buffer.from(String(headerToken));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = {
  generateCsrfToken,
  hashCsrfToken,
  tokensMatch,
};
