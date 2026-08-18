/**
 * Ensure every UG department has Semesters 1–8 and every PG department has 1–4.
 * Usage: node scripts/ensureStandardSemesters.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const { ensureStandardSemesters } = require('../src/services/taxonomy.service');
const logger = require('../src/config/logger');

async function main() {
  await connectDatabase();
  const result = await ensureStandardSemesters({
    _id: null,
    role: 'system',
    email: 'script@local',
  });
  logger.info('Standard semesters ensured', result);
  console.log(JSON.stringify(result, null, 2));
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await disconnectDatabase();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
