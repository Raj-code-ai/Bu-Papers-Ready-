const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const env = require('../config/env');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

function createSessionId() {
  return uuidv4();
}

function buildAuthTokens(user, sessionId) {
  const baseClaims = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    sessionId,
  };

  const accessToken = signAccessToken(baseClaims);
  const refreshToken = signRefreshToken({ ...baseClaims, type: 'refresh' });

  return { accessToken, refreshToken, sessionId };
}

function getRefreshExpiryDate() {
  const match = /^(\d+)([smhd])$/i.exec(env.jwtRefreshExpiresIn);
  const now = Date.now();
  if (!match) {
    return new Date(now + 7 * 24 * 60 * 60 * 1000);
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(now + amount * multipliers[unit]);
}

module.exports = {
  hashToken,
  generateRawToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  createSessionId,
  buildAuthTokens,
  getRefreshExpiryDate,
};
