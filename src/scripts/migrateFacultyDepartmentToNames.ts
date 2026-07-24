/**
 * One-time migration: convert User.faculty / User.department from ObjectId
 * references (into the old `faculties` / `departments` collections) into the
 * plain title strings used by the Option A model (see utils/facultyContent.ts).
 *
 * This script is intentionally self-contained: it reads the old collections
 * directly through the MongoDB driver, so it keeps working even after the
 * Faculty/Department Mongoose models have been removed from the codebase.
 *
 * Behaviour:
 *   - Copies the old stored title VERBATIM onto the user (preserves existing
 *     associations exactly).
 *   - WARNS (does not fail) when an ObjectId can't be resolved, or when a
 *     resolved title has no exact match in the new canonical dataset — so you
 *     can reconcile those units by hand.
 *
 * Safe to re-run: it only touches users whose faculty/department is still an
 * ObjectId (already-migrated string values are skipped).
 *
 * Usage:  npm run migrate:faculty
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../utils/logger';
import { isValidUnit, findUnitByTitle } from '../utils/facultyContent';

dotenv.config();

// Type the Db handle from mongoose's own bundled mongodb copy rather than the
// top-level `mongodb` package. On a machine where a second mongodb version is
// hoisted into node_modules, those two copies have incompatible (private)
// types, and mongoose.connection.db would not be assignable to a top-level
// `Db`. Deriving it here keeps this in step with what mongoose actually returns.
type Db = NonNullable<typeof mongoose.connection.db>;

interface TitledDoc {
  _id: mongoose.Types.ObjectId;
  title?: string;
}

export interface MigrationResult {
  scanned: number;
  updated: number;
  warnings: string[];
}

/**
 * Core migration logic, exported so it can be unit-tested against an
 * in-memory database. Operates on an already-connected Db handle.
 */
export async function migrateFacultyDepartment(db: Db): Promise<MigrationResult> {
  const faculties = (await db
    .collection('faculties')
    .find({})
    .toArray()) as unknown as TitledDoc[];
  const departments = (await db
    .collection('departments')
    .find({})
    .toArray()) as unknown as TitledDoc[];

  const facultyTitleById = new Map<string, string>();
  for (const f of faculties) if (f.title) facultyTitleById.set(String(f._id), f.title);

  const departmentTitleById = new Map<string, string>();
  for (const d of departments) if (d.title) departmentTitleById.set(String(d._id), d.title);

  logger.info(
    `[migrate] Loaded ${facultyTitleById.size} faculties and ${departmentTitleById.size} departments from old collections`
  );

  const users = db.collection('Users_2');
  const cursor = users.find({});

  let scanned = 0;
  let updated = 0;
  const warnings: string[] = [];

  for await (const user of cursor) {
    scanned += 1;
    const set: Record<string, string> = {};

    // faculty
    if (user.faculty && typeof user.faculty !== 'string') {
      const id = String(user.faculty);
      const title = facultyTitleById.get(id);
      if (title) {
        set.faculty = title;
        if (!isValidUnit(title)) {
          warnings.push(
            `User ${user._id}: faculty title "${title}" not found in canonical dataset`
          );
        }
      } else {
        warnings.push(
          `User ${user._id}: faculty ObjectId ${id} could not be resolved to a title (left unchanged)`
        );
      }
    }

    // department
    if (user.department && typeof user.department !== 'string') {
      const id = String(user.department);
      const title = departmentTitleById.get(id);
      if (title) {
        set.department = title;
        const parentTitle = String(set.faculty ?? user.faculty);
        const belongs = !!findUnitByTitle(parentTitle)?.departments.some(
          (d) => d.title.toLowerCase() === title.toLowerCase()
        );
        if (!belongs) {
          warnings.push(
            `User ${user._id}: department title "${title}" not matched under its faculty in canonical dataset`
          );
        }
      } else {
        warnings.push(
          `User ${user._id}: department ObjectId ${id} could not be resolved to a title (left unchanged)`
        );
      }
    }

    if (Object.keys(set).length > 0) {
      await users.updateOne({ _id: user._id }, { $set: set });
      updated += 1;
    }
  }

  logger.info(`[migrate] Done. Scanned ${scanned} users, updated ${updated}.`);
  if (warnings.length > 0) {
    logger.warn(`[migrate] ${warnings.length} warning(s) to reconcile:`);
    for (const w of warnings) logger.warn(`  - ${w}`);
  } else {
    logger.info('[migrate] No mismatches — all titles matched the dataset.');
  }

  return { scanned, updated, warnings };
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set.');

  await mongoose.connect(uri);
  logger.info('[migrate] Connected to database');

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database handle unavailable after connect.');

  await migrateFacultyDepartment(db);
}

// Only run automatically when invoked directly (not when imported by a test).
if (require.main === module) {
  main()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error('[migrate] Migration failed:', error);
      await mongoose.disconnect();
      process.exit(1);
    });
}
