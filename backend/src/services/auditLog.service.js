const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

async function writeAuditLog({
  action,
  actorId = null,
  actorRole = null,
  actorEmail = null,
  entityType = null,
  entityId = null,
  ip = '',
  userAgent = '',
  requestId = null,
  before = null,
  after = null,
  meta = null,
}) {
  try {
    await AuditLog.create({
      action,
      actorId,
      actorRole,
      actorEmail,
      entityType,
      entityId,
      ip,
      userAgent,
      requestId,
      before,
      after,
      meta,
    });
  } catch (error) {
    logger.error('Failed to write audit log', {
      action,
      error: error.message,
    });
  }
}

module.exports = {
  writeAuditLog,
};
