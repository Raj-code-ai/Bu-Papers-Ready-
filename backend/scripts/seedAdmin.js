/**
 * Development Admin seed / reset.
 *
 * Usage:
 *   npm run seed:admin
 *   npm run seed:admin -- --reset
 *
 * Never prints the password.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const User = require('../src/models/User');
const { ROLES } = require('../src/constants/roles');
const { assertPasswordStrength } = require('../src/utils/password');
const logger = require('../src/config/logger');

async function main() {
  const resetPassword = process.argv.includes('--reset');
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@arms.local').toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'ChangeMe!Admin1';
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Institution Admin';

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  assertPasswordStrength(password);
  await connectDatabase();

  let user = await User.findOne({ email }).select('+passwordHash +refreshTokens');
  let created = false;
  let reset = false;

  if (!user) {
    const passwordHash = await User.hashPasswordStatic(password);
    user = await User.create({
      name,
      email,
      passwordHash,
      role: ROLES.ADMIN,
      isActive: true,
      failedLoginAttempts: 0,
      lockUntil: null,
    });
    created = true;
  } else {
    if (user.role !== ROLES.ADMIN) {
      throw new Error('User exists but is not an Admin role');
    }
    user.isActive = true;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    if (resetPassword) {
      user.passwordHash = await User.hashPasswordStatic(password);
      user.passwordChangedAt = new Date();
      user.refreshTokens = [];
      reset = true;
    }
    await user.save();
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        email: user.email,
        role: user.role,
        created,
        reset,
        isActive: user.isActive,
      },
      null,
      2
    )
  );

  logger.info('seed:admin finished', { email: user.email, created, reset });
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error('seed:admin failed', { error: error.message });
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, error: error.message }));
  try {
    await disconnectDatabase();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
