/**
 * Seed editable taxonomy + policy defaults.
 * Usage: node scripts/seedDefaults.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const { seedDatabaseDefaults } = require('../src/services/seed.service');
const authService = require('../src/services/auth.service');
const logger = require('../src/config/logger');

async function main() {
  await connectDatabase();
  await authService.ensureBootstrapSuperAdmin();
  await seedDatabaseDefaults();
  await disconnectDatabase();
  logger.info('Seed script finished');
}

main().catch(async (error) => {
  logger.error('Seed script failed', { error: error.message });
  try {
    await disconnectDatabase();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
