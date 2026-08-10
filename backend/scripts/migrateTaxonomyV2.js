/**
 * Safe taxonomy migration: remap legacy Class 1–12 / Undergraduate / Postgraduate
 * AcademicLevel refs on papers to new bands (school_band / ug / pg) + ClassNodes.
 * Never deletes papers. Prefer disable over drop for obsolete levels.
 *
 * Usage: node scripts/migrateTaxonomyV2.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const { slugify } = require('../src/utils/slugify');
const {
  AcademicLevel,
  Programme,
  ClassNode,
  Paper,
} = require('../src/models');
const { seedAcademicStructure } = require('../src/services/seed.service');
const logger = require('../src/config/logger');

function bandSlugForClass(n) {
  if (n >= 1 && n <= 5) return 'class-1-5';
  if (n >= 6 && n <= 10) return 'class-6-10';
  if (n >= 11 && n <= 12) return 'class-11-12';
  return null;
}

async function ensureGeneralProgramme(level) {
  return Programme.findOneAndUpdate(
    { academicLevelId: level._id, slug: 'general' },
    {
      $set: {
        name: 'General',
        kind: level.kind === 'school_band' ? 'stream' : 'background',
        order: 0,
        isEnabled: true,
        academicLevelId: level._id,
      },
      $setOnInsert: { slug: 'general' },
    },
    { upsert: true, new: true }
  );
}

async function migratePapers() {
  const legacyClassLevels = await AcademicLevel.find({
    slug: { $in: Array.from({ length: 12 }, (_, i) => slugify(`Class ${i + 1}`)) },
  }).lean();

  let remapped = 0;

  for (const legacy of legacyClassLevels) {
    const match = /^class-(\d+)$/.exec(legacy.slug);
    if (!match) continue;
    const classNum = Number(match[1]);
    const bandSlug = bandSlugForClass(classNum);
    if (!bandSlug) continue;

    const band = await AcademicLevel.findOne({ slug: bandSlug });
    if (!band) continue;

    let classNode = await ClassNode.findOne({
      academicLevelId: band._id,
      slug: slugify(`class-${classNum}`),
      isEnabled: true,
    });

    // Class 11–12 may only exist under streams — use Science as default remapping
    if (!classNode && (classNum === 11 || classNum === 12)) {
      classNode = await ClassNode.findOne({
        academicLevelId: band._id,
        slug: slugify(`class-${classNum}-science`),
        isEnabled: true,
      });
    }

    const update = {
      academicLevelId: band._id,
    };
    if (classNode) {
      update.classNodeId = classNode._id;
      if (classNode.programmeId) update.programmeId = classNode.programmeId;
    }

    // Clear forced department for school papers if present but keep data if already set
    const result = await Paper.updateMany(
      { academicLevelId: legacy._id },
      { $set: update }
    );
    remapped += result.modifiedCount || 0;
  }

  // Undergraduate / Postgraduate slug remap
  const ugLegacy = await AcademicLevel.findOne({ slug: 'undergraduate' });
  const ugNew = await AcademicLevel.findOne({ slug: 'ug' });
  if (ugLegacy && ugNew) {
    const general = await ensureGeneralProgramme(ugNew);
    const result = await Paper.updateMany(
      { academicLevelId: ugLegacy._id },
      {
        $set: {
          academicLevelId: ugNew._id,
          programmeId: general._id,
        },
      }
    );
    remapped += result.modifiedCount || 0;
  }

  const pgLegacy = await AcademicLevel.findOne({ slug: 'postgraduate' });
  const pgNew = await AcademicLevel.findOne({ slug: 'pg' });
  if (pgLegacy && pgNew) {
    const general = await ensureGeneralProgramme(pgNew);
    const result = await Paper.updateMany(
      { academicLevelId: pgLegacy._id },
      {
        $set: {
          academicLevelId: pgNew._id,
          programmeId: general._id,
        },
      }
    );
    remapped += result.modifiedCount || 0;
  }

  return remapped;
}

async function main() {
  await connectDatabase();
  logger.info('Seeding academic structure (bands / UG / PG)...');
  await seedAcademicStructure();
  logger.info('Remapping papers to new taxonomy...');
  const remapped = await migratePapers();
  logger.info(`Taxonomy migration complete. Papers remapped: ${remapped}`);
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error('Taxonomy migration failed', { error: error.message, stack: error.stack });
  try {
    await disconnectDatabase();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
