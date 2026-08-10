const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const PasswordResetToken = require('../models/PasswordResetToken');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { assertPasswordStrength } = require('../utils/password');
const {
  hashToken,
  generateRawToken,
  createSessionId,
  buildAuthTokens,
  getRefreshExpiryDate,
  verifyRefreshToken,
} = require('../utils/token');
const {
  generateTwoFactorSecret,
  buildOtpAuthUrl,
  buildQrCodeDataUrl,
  verifyTwoFactorToken,
} = require('../security/twoFactor');
const { writeAuditLog } = require('./auditLog.service');
const { ROLES } = require('../constants/roles');
const logger = require('../config/logger');

function clientMeta(context = {}) {
  return {
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  };
}

async function recordLoginAttempt({ userId, email, success, reason, role, context }) {
  await LoginHistory.create({
    userId: userId || null,
    email,
    success,
    reason,
    role: role || null,
    ip: context.ip || '',
    userAgent: context.userAgent || '',
  });
}

async function attachRefreshSession(user, refreshToken, sessionId, context) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpiryDate();

  user.refreshTokens = (user.refreshTokens || []).filter((item) => item.expiresAt > new Date());
  user.refreshTokens.push({
    tokenHash,
    sessionId,
    expiresAt,
    userAgent: context.userAgent || '',
    ip: context.ip || '',
  });

  // Keep only the latest 10 sessions
  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(-10);
  }

  await user.save();
}

async function login({ email, password, twoFactorCode }, context = {}) {
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const meta = clientMeta(context);

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordHash +twoFactorSecret +refreshTokens'
  );

  if (!user) {
    await recordLoginAttempt({
      email: normalizedEmail,
      success: false,
      reason: 'USER_NOT_FOUND',
      context: meta,
    });
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    await recordLoginAttempt({
      userId: user._id,
      email: normalizedEmail,
      success: false,
      reason: 'ACCOUNT_DISABLED',
      role: user.role,
      context: meta,
    });
    throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
  }

  if (user.lockUntil && user.lockUntil > new Date()) {
    await recordLoginAttempt({
      userId: user._id,
      email: normalizedEmail,
      success: false,
      reason: 'ACCOUNT_LOCKED',
      role: user.role,
      context: meta,
    });
    throw new AppError('Account is temporarily locked due to failed login attempts', 423, 'ACCOUNT_LOCKED');
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    user.failedLoginAttempts += 1;

    if (user.failedLoginAttempts >= env.accountLockMaxAttempts) {
      user.lockUntil = new Date(Date.now() + env.accountLockDurationMinutes * 60 * 1000);
      user.failedLoginAttempts = 0;
      await user.save();

      await recordLoginAttempt({
        userId: user._id,
        email: normalizedEmail,
        success: false,
        reason: 'ACCOUNT_LOCKED',
        role: user.role,
        context: meta,
      });

      await writeAuditLog({
        action: 'AUTH_ACCOUNT_LOCKED',
        actorId: user._id,
        actorRole: user.role,
        actorEmail: user.email,
        entityType: 'User',
        entityId: user._id.toString(),
        ...meta,
      });

      throw new AppError('Account is temporarily locked due to failed login attempts', 423, 'ACCOUNT_LOCKED');
    }

    await user.save();
    await recordLoginAttempt({
      userId: user._id,
      email: normalizedEmail,
      success: false,
      reason: 'INVALID_PASSWORD',
      role: user.role,
      context: meta,
    });
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // First-time Super Admin login is allowed with password only.
  // SUPER_ADMIN_2FA_ENABLED requires setup after login, not OTP before first setup.
  const mustSetupTwoFactor =
    user.role === ROLES.SUPER_ADMIN &&
    env.superAdmin2faEnabled &&
    !user.twoFactorEnabled;

  // OTP is required only after 2FA has been successfully configured.
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!twoFactorCode) {
      throw new AppError('Two-factor authentication code is required', 401, 'TWO_FACTOR_REQUIRED');
    }

    const validOtp = verifyTwoFactorToken(user.twoFactorSecret, twoFactorCode);
    if (!validOtp) {
      await recordLoginAttempt({
        userId: user._id,
        email: normalizedEmail,
        success: false,
        reason: 'INVALID_2FA',
        role: user.role,
        context: meta,
      });
      throw new AppError('Invalid two-factor authentication code', 401, 'INVALID_TWO_FACTOR');
    }
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();

  const sessionId = createSessionId();
  const tokens = buildAuthTokens(user, sessionId);
  await attachRefreshSession(user, tokens.refreshToken, sessionId, meta);

  await recordLoginAttempt({
    userId: user._id,
    email: normalizedEmail,
    success: true,
    reason: 'LOGIN_SUCCESS',
    role: user.role,
    context: meta,
  });

  await writeAuditLog({
    action: 'AUTH_LOGIN',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
    meta: { sessionId },
  });

  return {
    user: user.toSafeObject(),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    sessionId,
    expiresIn: env.jwtAccessExpiresIn,
    mustSetupTwoFactor,
  };
}

async function refresh({ refreshToken }, context = {}) {
  const meta = clientMeta(context);

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401, 'UNAUTHORIZED');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (payload.type !== 'refresh') {
    throw new AppError('Invalid refresh token type', 401, 'INVALID_REFRESH_TOKEN');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'UNAUTHORIZED');
  }

  const tokenHash = hashToken(refreshToken);
  const existing = (user.refreshTokens || []).find(
    (item) => item.tokenHash === tokenHash && item.sessionId === payload.sessionId
  );

  if (!existing || existing.expiresAt < new Date()) {
    throw new AppError('Refresh session is invalid or expired', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Rotate refresh token
  user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== tokenHash);
  const sessionId = payload.sessionId || createSessionId();
  const tokens = buildAuthTokens(user, sessionId);
  await attachRefreshSession(user, tokens.refreshToken, sessionId, meta);

  await writeAuditLog({
    action: 'AUTH_TOKEN_REFRESH',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
    meta: { sessionId },
  });

  return {
    user: user.toSafeObject(),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    sessionId,
    expiresIn: env.jwtAccessExpiresIn,
  };
}

async function logout({ userId, refreshToken, allSessions = false }, context = {}) {
  const meta = clientMeta(context);
  const user = await User.findById(userId).select('+refreshTokens');

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (allSessions) {
    user.refreshTokens = [];
  } else if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    user.refreshTokens = (user.refreshTokens || []).filter((item) => item.tokenHash !== tokenHash);
  }

  await user.save();

  await writeAuditLog({
    action: allSessions ? 'AUTH_LOGOUT_ALL' : 'AUTH_LOGOUT',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
  });

  return { loggedOut: true };
}

async function changePassword({ userId, currentPassword, newPassword }, context = {}) {
  const meta = clientMeta(context);
  assertPasswordStrength(newPassword);

  const user = await User.findById(userId).select('+passwordHash +passwordHistory +refreshTokens');
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
  }

  const reused = await Promise.all(
    (user.passwordHistory || []).map((item) => bcrypt.compare(newPassword, item.hash))
  );
  if (reused.some(Boolean) || (await user.comparePassword(newPassword))) {
    throw new AppError('New password must not match a recently used password', 400, 'PASSWORD_REUSED');
  }

  const previousHash = user.passwordHash;
  user.passwordHash = await user.hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.passwordHistory = [
    ...(user.passwordHistory || []),
    { hash: previousHash, changedAt: new Date() },
  ].slice(-5);
  user.refreshTokens = [];
  await user.save();

  await writeAuditLog({
    action: 'AUTH_PASSWORD_CHANGE',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
  });

  return { passwordChanged: true };
}

async function forgotPassword({ email }, context = {}) {
  const meta = clientMeta(context);
  const normalizedEmail = String(email || '').toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  // Always return success to avoid account enumeration
  if (!user) {
    return {
      accepted: true,
      message: 'If an account exists for that email, a reset token has been issued',
      resetToken: null,
    };
  }

  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });

  const rawToken = generateRawToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + env.passwordResetTokenExpiresMinutes * 60 * 1000);

  await PasswordResetToken.create({
    userId: user._id,
    tokenHash,
    expiresAt,
    requestedIp: meta.ip,
    userAgent: meta.userAgent,
  });

  await writeAuditLog({
    action: 'AUTH_PASSWORD_RESET_REQUESTED',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
  });

  // Email provider integrates in later phases. In development, return token for testing.
  const response = {
    accepted: true,
    message: 'If an account exists for that email, a reset token has been issued',
  };

  if (!env.isProduction) {
    response.resetToken = rawToken;
    response.expiresAt = expiresAt;
  }

  return response;
}

async function resetPassword({ token, newPassword }, context = {}) {
  const meta = clientMeta(context);
  assertPasswordStrength(newPassword);

  if (!token) {
    throw new AppError('Reset token is required', 400, 'VALIDATION_ERROR');
  }

  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash, usedAt: null });

  if (!record || record.expiresAt < new Date()) {
    throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  }

  const user = await User.findById(record.userId).select('+passwordHash +passwordHistory +refreshTokens');
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 400, 'INVALID_RESET_TOKEN');
  }

  const previousHash = user.passwordHash;
  user.passwordHash = await user.hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  user.passwordHistory = [
    ...(user.passwordHistory || []),
    { hash: previousHash, changedAt: new Date() },
  ].slice(-5);
  user.refreshTokens = [];
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  record.usedAt = new Date();
  await record.save();

  await writeAuditLog({
    action: 'AUTH_PASSWORD_RESET',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
  });

  return { passwordReset: true };
}

async function setupTwoFactor({ userId }, context = {}) {
  const meta = clientMeta(context);
  const user = await User.findById(userId).select('+twoFactorSecret');

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  if (user.role !== ROLES.SUPER_ADMIN) {
    throw new AppError('Two-factor setup is required only for Super Admin in this phase', 403, 'FORBIDDEN');
  }

  const secret = generateTwoFactorSecret();
  user.twoFactorSecret = secret;
  user.twoFactorEnabled = false;
  await user.save();

  const otpauthUrl = buildOtpAuthUrl(user.email, secret);
  const qrCodeDataUrl = await buildQrCodeDataUrl(otpauthUrl);

  await writeAuditLog({
    action: 'AUTH_2FA_SETUP_STARTED',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

async function verifyAndEnableTwoFactor({ userId, token }, context = {}) {
  const meta = clientMeta(context);
  const user = await User.findById(userId).select('+twoFactorSecret');

  if (!user || !user.twoFactorSecret) {
    throw new AppError('Two-factor setup has not been started', 400, 'TWO_FACTOR_NOT_STARTED');
  }

  const valid = verifyTwoFactorToken(user.twoFactorSecret, token);
  if (!valid) {
    throw new AppError('Invalid two-factor authentication code', 400, 'INVALID_TWO_FACTOR');
  }

  user.twoFactorEnabled = true;
  await user.save();

  await writeAuditLog({
    action: 'AUTH_2FA_ENABLED',
    actorId: user._id,
    actorRole: user.role,
    actorEmail: user.email,
    entityType: 'User',
    entityId: user._id.toString(),
    ...meta,
  });

  return { twoFactorEnabled: true };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }
  return user.toSafeObject();
}

async function ensureBootstrapSuperAdmin({ resetPassword = false } = {}) {
  const email = (process.env.BOOTSTRAP_SUPERADMIN_EMAIL || 'superadmin@arms.local').toLowerCase();
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD || 'ChangeMe!SuperAdmin1';
  const name = process.env.BOOTSTRAP_SUPERADMIN_NAME || 'Super Admin';

  assertPasswordStrength(password);

  let user = await User.findOne({ role: ROLES.SUPER_ADMIN }).select(
    '+passwordHash +refreshTokens +twoFactorSecret'
  );

  if (!user) {
    const passwordHash = await User.hashPasswordStatic(password);
    user = await User.create({
      name,
      email,
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      isActive: true,
      twoFactorEnabled: false,
      failedLoginAttempts: 0,
      lockUntil: null,
    });

    logger.warn('Bootstrap Super Admin created. Enable 2FA after first password login.', {
      email: user.email,
    });

    return {
      created: true,
      reset: false,
      email: user.email,
      user: user.toSafeObject(),
    };
  }

  // Keep account usable for development bootstrap without rewriting password unless asked.
  let reset = false;
  user.isActive = true;
  user.failedLoginAttempts = 0;
  user.lockUntil = null;

  if (user.email !== email) {
    user.email = email;
  }

  if (resetPassword) {
    user.passwordHash = await User.hashPasswordStatic(password);
    user.passwordChangedAt = new Date();
    user.refreshTokens = [];
    // Development reset: clear 2FA so first-login setup flow can be re-tested safely.
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    reset = true;
  }

  await user.save();

  if (reset) {
    logger.warn('Development Super Admin password was reset. Password value not logged.', {
      email: user.email,
    });
  }

  return {
    created: false,
    reset,
    email: user.email,
    user: user.toSafeObject(),
  };
}

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  setupTwoFactor,
  verifyAndEnableTwoFactor,
  getProfile,
  ensureBootstrapSuperAdmin,
};
