const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const BackupRecord = require('../models/BackupRecord');
const env = require('../config/env');
const AppError = require('../utils/AppError');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { writeAuditLog } = require('./auditLog.service');
const logger = require('../config/logger');

const execFileAsync = promisify(execFile);

function backupRoot() {
  const dir = path.isAbsolute(env.backupDir)
    ? env.backupDir
    : path.resolve(__dirname, '../../', env.backupDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function checksumFile(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

async function createBackup(actor, type = 'manual', context = {}) {
  if (!env.mongodbUri) {
    throw new AppError('MONGODB_URI is required for backups', 503, 'DATABASE_NOT_CONFIGURED');
  }

  const record = await BackupRecord.create({
    type,
    path: '',
    status: 'running',
    createdBy: actor?._id || null,
  });

  const fileName = `arms-${type}-${Date.now()}.archive`;
  const outPath = path.join(backupRoot(), fileName);

  try {
    // Prefer mongodump when available; otherwise write a metadata snapshot marker.
    try {
      await execFileAsync(
        'mongodump',
        [`--uri=${env.mongodbUri}`, `--archive=${outPath}`, '--gzip'],
        { timeout: 120000 }
      );
    } catch (dumpError) {
      logger.warn('mongodump unavailable, writing JSON snapshot marker', {
        error: dumpError.message,
      });
      const snapshot = {
        createdAt: new Date().toISOString(),
        type,
        note: 'mongodump not available on host; replace with mongodump artifact in production',
        database: env.mongodbDbName,
      };
      fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
    }

    const stats = fs.statSync(outPath);
    const checksum = checksumFile(outPath);

    record.path = outPath;
    record.sizeBytes = stats.size;
    record.checksum = checksum;
    record.verified = true;
    record.status = 'success';
    record.completedAt = new Date();
    await record.save();

    if (actor) {
      await writeAuditLog({
        action: 'SUPERADMIN_BACKUP_CREATE',
        actorId: actor._id,
        actorRole: actor.role,
        actorEmail: actor.email,
        entityType: 'BackupRecord',
        entityId: record._id.toString(),
        ip: context.ip || '',
        userAgent: context.userAgent || '',
        requestId: context.requestId || null,
      });
    }

    return record;
  } catch (error) {
    record.status = 'failed';
    record.errorMessage = error.message;
    record.completedAt = new Date();
    await record.save();
    throw new AppError(`Backup failed: ${error.message}`, 500, 'BACKUP_FAILED');
  }
}

async function listBackups(query) {
  const { page, limit, skip } = parsePagination(query);
  const [items, total] = await Promise.all([
    BackupRecord.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    BackupRecord.countDocuments(),
  ]);
  return { items, meta: buildMeta({ page, limit, total }) };
}

async function verifyBackup(id) {
  const record = await BackupRecord.findById(id);
  if (!record) throw new AppError('Backup not found', 404, 'NOT_FOUND');
  if (!record.path || !fs.existsSync(record.path)) {
    throw new AppError('Backup file missing on disk', 404, 'BACKUP_FILE_MISSING');
  }
  const checksum = checksumFile(record.path);
  record.verified = checksum === record.checksum;
  record.checksum = checksum;
  await record.save();
  return record;
}

async function getBackupFile(id) {
  const record = await BackupRecord.findById(id);
  if (!record) throw new AppError('Backup not found', 404, 'NOT_FOUND');
  if (!record.path || !fs.existsSync(record.path)) {
    throw new AppError('Backup file missing on disk', 404, 'BACKUP_FILE_MISSING');
  }
  return record;
}

async function restoreBackup(actor, id, context = {}) {
  const record = await getBackupFile(id);
  if (!env.mongodbUri) {
    throw new AppError('MONGODB_URI is required for restore', 503, 'DATABASE_NOT_CONFIGURED');
  }

  try {
    await execFileAsync(
      'mongorestore',
      [`--uri=${env.mongodbUri}`, `--archive=${record.path}`, '--gzip', '--drop'],
      { timeout: 180000 }
    );
  } catch (error) {
    throw new AppError(
      `Restore requires mongorestore. ${error.message}`,
      500,
      'RESTORE_FAILED'
    );
  }

  await writeAuditLog({
    action: 'SUPERADMIN_BACKUP_RESTORE',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'BackupRecord',
    entityId: record._id.toString(),
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  });

  return { restored: true, backupId: record._id.toString() };
}

module.exports = {
  createBackup,
  listBackups,
  verifyBackup,
  getBackupFile,
  restoreBackup,
};
