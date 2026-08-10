/**
 * Development Super Admin seed / reset.
 *
 * Usage:
 *   npm run seed:superadmin
 *   npm run seed:superadmin -- --reset
 *
 * --reset resets password from BOOTSTRAP_SUPERADMIN_PASSWORD, clears lock state,
 * and activates the account. Never prints the password.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const authService = require('../src/services/auth.service');
const logger = require('../src/config/logger');

async function main() {
  const resetPassword = process.argv.includes('--reset');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await connectDatabase();
  const result = await authService.ensureBootstrapSuperAdmin({ resetPassword });

  // Print only email + operation result (never password).
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        email: result.email,
        created: result.created,
        reset: result.reset,
        isActive: result.user?.isActive === true,
        twoFactorEnabled: result.user?.twoFactorEnabled === true,
        role: result.user?.role,
      },
      null,
      2
    )
  );

  logger.info('seed:superadmin finished', {
    email: result.email,
    created: result.created,
    reset: result.reset,
  });

  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error('seed:superadmin failed', { error: error.message });
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({ ok: false, error: error.message }));
  try {
    await disconnectDatabase();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
