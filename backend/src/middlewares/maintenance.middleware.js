const mongoose = require('mongoose');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { ROLES } = require('../constants/roles');
const SystemConfig = require('../models/SystemConfig');

let cache = { at: 0, value: null };
const CACHE_MS = 5000;

async function getMaintenanceState() {
  const now = Date.now();
  if (cache.value && now - cache.at < CACHE_MS) {
    return cache.value;
  }

  let fromDb = null;
  if (mongoose.connection.readyState === 1) {
    try {
      fromDb = await SystemConfig.findOne()
        .select('maintenanceMode maintenanceMessage maintenanceBlockPublic')
        .lean()
        .maxTimeMS(1500);
    } catch {
      fromDb = null;
    }
  }

  const value = {
    enabled: Boolean(fromDb?.maintenanceMode ?? env.maintenanceMode),
    message:
      fromDb?.maintenanceMessage ||
      env.maintenanceMessage ||
      'Website temporarily unavailable while maintenance is being performed.',
    blockPublic: fromDb?.maintenanceBlockPublic !== false,
  };
  cache = { at: now, value };
  return value;
}

function clearMaintenanceCache() {
  cache = { at: 0, value: null };
}

async function maintenanceMiddleware(req, res, next) {
  try {
    const state = await getMaintenanceState();
    if (!state.enabled) {
      return next();
    }

    const path = req.originalUrl || req.path || '';
    const allowHealth = path.includes('/health');
    const allowDocs = path.startsWith(env.swaggerPath);
    const allowPublicConfig = path.includes('/public/site-config');
    const allowAuth =
      path.includes('/auth/login') ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/logout') ||
      path.includes('/auth/me') ||
      path.includes('/auth/2fa') ||
      path.includes('/auth/forgot-password') ||
      path.includes('/auth/reset-password');

    if (allowHealth || allowDocs || allowPublicConfig || allowAuth) {
      return next();
    }

    if (state.blockPublic && path.includes('/public/') && !path.includes('/public/site-config')) {
      return next(new AppError(state.message, 503, 'MAINTENANCE_MODE'));
    }

    if (req.user && [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role)) {
      return next();
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && path.includes('/public/')) {
      return next(new AppError(state.message, 503, 'MAINTENANCE_MODE'));
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = maintenanceMiddleware;
module.exports.clearMaintenanceCache = clearMaintenanceCache;
module.exports.getMaintenanceState = getMaintenanceState;
