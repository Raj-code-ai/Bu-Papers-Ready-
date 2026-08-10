const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const AuditLog = require('../models/AuditLog');
const AppError = require('../utils/AppError');
const { assertPasswordStrength } = require('../utils/password');
const { parsePagination, buildMeta, parseSort } = require('../utils/pagination');
const { writeAuditLog } = require('./auditLog.service');
const { ROLES } = require('../constants/roles');

function metaFrom(context = {}) {
  return {
    ip: context.ip || '',
    userAgent: context.userAgent || '',
    requestId: context.requestId || null,
  };
}

async function listAdmins(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { role: ROLES.ADMIN };
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
  if (query.q) {
    filter.$or = [
      { name: new RegExp(query.q, 'i') },
      { email: new RegExp(query.q, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => u.toSafeObject()),
    meta: buildMeta({ page, limit, total }),
  };
}

async function createAdmin(actor, body, context = {}) {
  const email = String(body.email || '').toLowerCase().trim();
  assertPasswordStrength(body.password);

  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email already in use', 409, 'CONFLICT');

  const passwordHash = await User.hashPasswordStatic(body.password);
  const admin = await User.create({
    name: body.name,
    email,
    passwordHash,
    role: ROLES.ADMIN,
    isActive: true,
    createdBy: actor._id,
  });

  await writeAuditLog({
    action: 'SUPERADMIN_CREATE_ADMIN',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'User',
    entityId: admin._id.toString(),
    after: { email: admin.email, name: admin.name },
    ...metaFrom(context),
  });

  return admin.toSafeObject();
}

async function updateAdmin(actor, adminId, body, context = {}) {
  const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN });
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND');

  const before = admin.toSafeObject();
  if (body.name) admin.name = body.name;
  if (body.email) admin.email = String(body.email).toLowerCase().trim();
  await admin.save();

  await writeAuditLog({
    action: 'SUPERADMIN_UPDATE_ADMIN',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'User',
    entityId: admin._id.toString(),
    before,
    after: admin.toSafeObject(),
    ...metaFrom(context),
  });

  return admin.toSafeObject();
}

async function setAdminActive(actor, adminId, isActive, context = {}) {
  const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN }).select('+refreshTokens');
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND');

  admin.isActive = Boolean(isActive);
  if (!isActive) admin.refreshTokens = [];
  await admin.save();

  await writeAuditLog({
    action: isActive ? 'SUPERADMIN_ENABLE_ADMIN' : 'SUPERADMIN_DISABLE_ADMIN',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'User',
    entityId: admin._id.toString(),
    ...metaFrom(context),
  });

  return admin.toSafeObject();
}

async function deleteAdmin(actor, adminId, context = {}) {
  const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN });
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND');

  await User.deleteOne({ _id: admin._id });

  await writeAuditLog({
    action: 'SUPERADMIN_DELETE_ADMIN',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'User',
    entityId: adminId,
    before: { email: admin.email, name: admin.name },
    ...metaFrom(context),
  });

  return { deleted: true, id: adminId };
}

async function resetAdminPassword(actor, adminId, newPassword, context = {}) {
  assertPasswordStrength(newPassword);
  const admin = await User.findOne({ _id: adminId, role: ROLES.ADMIN }).select(
    '+passwordHash +refreshTokens +passwordHistory'
  );
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND');

  const previousHash = admin.passwordHash;
  admin.passwordHash = await admin.hashPassword(newPassword);
  admin.passwordChangedAt = new Date();
  admin.passwordHistory = [...(admin.passwordHistory || []), { hash: previousHash }].slice(-5);
  admin.refreshTokens = [];
  admin.failedLoginAttempts = 0;
  admin.lockUntil = null;
  await admin.save();

  await writeAuditLog({
    action: 'SUPERADMIN_RESET_ADMIN_PASSWORD',
    actorId: actor._id,
    actorRole: actor.role,
    actorEmail: actor.email,
    entityType: 'User',
    entityId: admin._id.toString(),
    ...metaFrom(context),
  });

  return { passwordReset: true, id: admin._id.toString() };
}

async function listLoginHistory(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.email) filter.email = String(query.email).toLowerCase();
  if (query.success !== undefined) filter.success = query.success === 'true';

  const [items, total] = await Promise.all([
    LoginHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    LoginHistory.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

async function listAuditLogs(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.entityType) filter.entityType = query.entityType;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { items, meta: buildMeta({ page, limit, total }) };
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
  setAdminActive,
  deleteAdmin,
  resetAdminPassword,
  listLoginHistory,
  listAuditLogs,
};
