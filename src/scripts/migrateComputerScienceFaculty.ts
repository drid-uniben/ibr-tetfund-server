/**
 * One-time migration: move Computer Science lecturers out of the (old) Faculty
 * of Physical Sciences into the new Faculty of Computing.
 *
 * Background: UNIBEN created a Faculty of Computing (2025) and Computer Science
 * moved there (see utils/facultyContent.ts). Because user records store
 * faculty/department as independent title strings (Option A), records saved
 * before that change still read faculty="Faculty of Physical Sciences" +
 * department="...Computer Science" and would now fail isValidUnitDepartment.
 * This script reconciles them.
 *
 * Behaviour:
 *   - Matches users whose department looks like Computer Science (with or
 *     without a "Department of" prefix) AND whose faculty looks like Physical
 *     Sciences, then sets faculty="Faculty of Computing" and normalizes
 *     department to the canonical "Department of Computer Science".
 *   - WARNS (does not fail) on a Computer Science record whose faculty is
 *     something unexpected, and leaves it unchanged for manual review.
 *
 * Safe to re-run: records already on "Faculty of Computing" are skipped.
 *
 * Usage:  npm run migrate:cs-faculty
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

// Derive the Db type from mongoose's own bundled mongodb copy (see
// migrateFacultyDepartmentToNames.ts for why we avoid the top-level package).
type Db = NonNullable<typeof mongoose.connection.db>;

const NEW_FACULTY = 'Faculty of Computing';
const CANONICAL_CS_DEPARTMENT = 'Department of Computer Science';
const COMPUTER_SCIENCE_RE = /^(department of\s+)?computer science$/i;
const PHYSICAL_SCIENCES_RE = /physical sciences/i;

export interface MigrationResult {
  scanned: number;
  updated: number;
  warnings: string[];
}

/**
 * Core migration logic, exported so it can be unit-tested against an in-memory
 * database. Operates on an already-connected Db handle.
 */
export async function migrateComputerScienceFaculty(
  db: Db
): Promise<MigrationResult> {
  const users = db.collection('Users_2');
  const cursor = users.find({});

  let scanned = 0;
  let updated = 0;
  const warnings: string[] = [];

  for await (const user of cursor) {
    scanned += 1;

    const department =
      typeof user.department === 'string' ? user.department.trim() : '';
    const faculty =
      typeof user.faculty === 'string' ? user.faculty.trim() : '';

    // Only Computer Science records are affected by the faculty move.
    if (!COMPUTER_SCIENCE_RE.test(department)) {
      continue;
    }

    // Already migrated — idempotent skip.
    if (faculty === NEW_FACULTY) {
      continue;
    }

    // A CS record whose faculty is neither Physical Sciences nor Computing is
    // unexpected; leave it for manual review rather than guessing.
    if (faculty && !PHYSICAL_SCIENCES_RE.test(faculty)) {
      warnings.push(
        `User ${user._id}: Computer Science department but unexpected faculty "${faculty}" (left unchanged)`
      );
      continue;
    }

    await users.updateOne(
      { _id: user._id },
      { $set: { faculty: NEW_FACULTY, department: CANONICAL_CS_DEPARTMENT } }
    );
    updated += 1;
  }

  logger.info(
    `[migrate:cs] Done. Scanned ${scanned} users, updated ${updated}.`
  );
  if (warnings.length > 0) {
    logger.warn(`[migrate:cs] ${warnings.length} warning(s) to reconcile:`);
    for (const w of warnings) logger.warn(`  - ${w}`);
  } else {
    logger.info('[migrate:cs] No ambiguous records.');
  }

  return { scanned, updated, warnings };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set.');

  await mongoose.connect(uri);
  logger.info('[migrate:cs] Connected to database');

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database handle unavailable after connect.');

  await migrateComputerScienceFaculty(db);
}

// Only run automatically when invoked directly (not when imported by a test).
if (require.main === module) {
  main()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error('[migrate:cs] Migration failed:', error);
      await mongoose.disconnect();
      process.exit(1);
    });
}
