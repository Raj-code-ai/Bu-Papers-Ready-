const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const env = require('../config/env');
const { ROLES } = require('../constants/roles');

function requestContext(req) {
  return {
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
    requestId: req.requestId,
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const common = {
    httpOnly: true,
    secure: env.cookieSecure,
    // Cross-site SPA (Vercel) → API (Render) needs SameSite=None + Secure.
    sameSite: env.cookieSecure ? 'none' : 'lax',
  };

  res.cookie('accessToken', accessToken, {
    ...common,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...common,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
}

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin / Super Admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               twoFactorCode: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 */
const login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body, requestContext(req));
  setAuthCookies(res, data.accessToken, data.refreshToken);
  return success(res, data, 'Login successful');
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 */
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
  const data = await authService.refresh({ refreshToken }, requestContext(req));
  setAuthCookies(res, data.accessToken, data.refreshToken);
  return success(res, data, 'Token refreshed');
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     security:
 *       - bearerAuth: []
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
  const data = await authService.logout(
    {
      userId: req.user._id,
      refreshToken,
      allSessions: Boolean(req.body.allSessions),
    },
    requestContext(req)
  );
  clearAuthCookies(res);
  return success(res, data, 'Logged out');
});

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change password for authenticated user
 *     security:
 *       - bearerAuth: []
 */
const changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(
    {
      userId: req.user._id,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    },
    requestContext(req)
  );
  clearAuthCookies(res);
  return success(res, data, 'Password changed successfully. Please login again.');
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset token
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword({ email: req.body.email }, requestContext(req));
  return success(res, data, data.message);
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 */
const resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(
    {
      token: req.body.token,
      newPassword: req.body.newPassword,
    },
    requestContext(req)
  );
  return success(res, data, 'Password reset successful');
});

/**
 * @openapi
 * /auth/2fa/setup:
 *   post:
 *     tags: [Auth]
 *     summary: Start Super Admin 2FA setup
 *     security:
 *       - bearerAuth: []
 */
const setupTwoFactor = asyncHandler(async (req, res) => {
  const data = await authService.setupTwoFactor({ userId: req.user._id }, requestContext(req));
  return success(res, data, 'Two-factor setup started');
});

/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify and enable 2FA
 *     security:
 *       - bearerAuth: []
 */
const verifyTwoFactor = asyncHandler(async (req, res) => {
  const data = await authService.verifyAndEnableTwoFactor(
    {
      userId: req.user._id,
      token: req.body.token,
    },
    requestContext(req)
  );
  return success(res, data, 'Two-factor authentication enabled');
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current authenticated profile
 *     security:
 *       - bearerAuth: []
 */
const me = asyncHandler(async (req, res) => {
  const data = await authService.getProfile(req.user._id);
  const mustSetupTwoFactor =
    data.role === ROLES.SUPER_ADMIN &&
    env.superAdmin2faEnabled &&
    !data.twoFactorEnabled;

  return success(
    res,
    {
      ...data,
      mustSetupTwoFactor,
    },
    'Profile fetched'
  );
});

module.exports = {
  login,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  setupTwoFactor,
  verifyTwoFactor,
  me,
};
