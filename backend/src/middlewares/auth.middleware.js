const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/token');
const { ROLES } = require('../constants/roles');

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractBearerToken(req);
  if (!token) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    throw new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');
  }

  if (
    user.passwordChangedAt &&
    payload.iat * 1000 < new Date(user.passwordChangedAt).getTime()
  ) {
    throw new AppError('Password was changed. Please login again.', 401, 'TOKEN_REVOKED');
  }

  req.user = user;
  req.auth = {
    userId: user._id.toString(),
    role: user.role,
    email: user.email,
    sessionId: payload.sessionId,
  };

  return next();
});

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    }

    return next();
  };
}

function requireTwoFactorCompleted(req, res, next) {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const needsSetup =
    req.user.role === ROLES.SUPER_ADMIN &&
    env.superAdmin2faEnabled &&
    !req.user.twoFactorEnabled;

  if (!needsSetup) {
    return next();
  }

  const allowedPaths = [
    '/auth/2fa/setup',
    '/auth/2fa/verify',
    '/auth/me',
    '/auth/logout',
    '/auth/change-password',
  ];

  const isAllowed = allowedPaths.some((path) => req.path.endsWith(path) || req.originalUrl.includes(path));
  if (isAllowed) {
    return next();
  }

  return next(
    new AppError(
      'Two-factor authentication must be enabled before continuing',
      403,
      'TWO_FACTOR_SETUP_REQUIRED'
    )
  );
}

module.exports = {
  authenticate,
  authorize,
  requireTwoFactorCompleted,
  extractBearerToken,
};
