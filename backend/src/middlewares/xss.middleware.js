/**
 * Lightweight XSS neutralization for string bodies.
 * React already escapes render output; this reduces stored XSS risk in APIs.
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, nested] of Object.entries(value)) {
      // Skip password-like fields so hashing still works on raw input
      if (['password', 'currentPassword', 'newPassword', 'token', 'refreshToken'].includes(key)) {
        output[key] = nested;
      } else {
        output[key] = sanitizeValue(nested);
      }
    }
    return output;
  }
  return value;
}

function xssSanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  return next();
}

module.exports = xssSanitizeMiddleware;
