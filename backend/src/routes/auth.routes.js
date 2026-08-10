const express = require('express');
const authController = require('../controllers/auth.controller');
const {
  loginValidators,
  refreshValidators,
  changePasswordValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  twoFactorVerifyValidators,
} = require('../validators/auth.validators');
const { authenticate } = require('../middlewares/auth.middleware');
const { createAuthRateLimiter } = require('../config/rateLimit');

const router = express.Router();
const authLimiter = createAuthRateLimiter();

router.post('/login', authLimiter, loginValidators, authController.login);
router.post('/refresh', authLimiter, refreshValidators, authController.refresh);
router.post('/forgot-password', authLimiter, forgotPasswordValidators, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidators, authController.resetPassword);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  changePasswordValidators,
  authController.changePassword
);
router.post('/2fa/setup', authenticate, authController.setupTwoFactor);
router.post(
  '/2fa/verify',
  authenticate,
  twoFactorVerifyValidators,
  authController.verifyTwoFactor
);

module.exports = router;
