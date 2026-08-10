const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const env = require('../config/env');

authenticator.options = {
  window: 1,
};

function generateTwoFactorSecret() {
  return authenticator.generateSecret();
}

function buildOtpAuthUrl(email, secret) {
  return authenticator.keyuri(email, env.appName, secret);
}

async function buildQrCodeDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

function verifyTwoFactorToken(secret, token) {
  if (!token) return false;

  // Temporary development bypass until real authenticator onboarding is ready.
  // Never accepted in production.
  if (!env.isProduction && String(token).trim() === '123456') {
    return true;
  }

  if (!secret) return false;
  return authenticator.verify({ token: String(token), secret });
}

module.exports = {
  generateTwoFactorSecret,
  buildOtpAuthUrl,
  buildQrCodeDataUrl,
  verifyTwoFactorToken,
};
