import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { migrateFacultyDepartment } from '../scripts/migrateFacultyDepartmentToNames';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const db = mongoose.connection.db!;
  await Promise.all([
    db.collection('faculties').deleteMany({}),
    db.collection('departments').deleteMany({}),
    db.collection('Users_2').deleteMany({}),
  ]);
});

describe('migrateFacultyDepartment', () => {
  it('converts ObjectId faculty/department refs into their title strings', async () => {
    const db = mongoose.connection.db!;
    const facultyId = new mongoose.Types.ObjectId();
    const deptId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    await db.collection('faculties').insertOne({
      _id: facultyId,
      code: 'PSC',
      title: 'Faculty of Physical Sciences',
    });
    await db.collection('departments').insertOne({
      _id: deptId,
      code: 'CSC',
      title: 'Department of Computer Science',
    });
    await db.collection('Users_2').insertOne({
      _id: userId,
      name: 'Test User',
      faculty: facultyId,
      department: deptId,
    });

    const result = await migrateFacultyDepartment(db);

    expect(result.updated).toBe(1);
    const migrated = await db.collection('Users_2').findOne({ _id: userId });
    expect(migrated?.faculty).toBe('Faculty of Physical Sciences');
    expect(migrated?.department).toBe('Department of Computer Science');
    expect(result.warnings).toHaveLength(0);
  });

  it('warns and leaves the value unchanged when an ObjectId cannot be resolved', async () => {
    const db = mongoose.connection.db!;
    const unknownFacultyId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    await db.collection('Users_2').insertOne({
      _id: userId,
      name: 'Orphan Ref',
      faculty: unknownFacultyId,
    });

    const result = await migrateFacultyDepartment(db);

    expect(result.updated).toBe(0);
    expect(result.warnings.some((w) => w.includes('could not be resolved'))).toBe(
      true
    );
    const untouched = await db.collection('Users_2').findOne({ _id: userId });
    expect(untouched?.faculty).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('skips users whose faculty is already a string (idempotent re-run)', async () => {
    const db = mongoose.connection.db!;
    await db.collection('Users_2').insertOne({
      _id: new mongoose.Types.ObjectId(),
      name: 'Already Migrated',
      faculty: 'Faculty of Law',
      department: 'Department of Public Law',
    });

    const result = await migrateFacultyDepartment(db);

    expect(result.scanned).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('warns when a resolved title is not in the canonical dataset', async () => {
    const db = mongoose.connection.db!;
    const facultyId = new mongoose.Types.ObjectId();
    await db.collection('faculties').insertOne({
      _id: facultyId,
      code: 'OLD',
      title: 'Faculty of Obsolete Studies',
    });
    await db.collection('Users_2').insertOne({
      _id: new mongoose.Types.ObjectId(),
      name: 'Legacy Faculty',
      faculty: facultyId,
    });

    const result = await migrateFacultyDepartment(db);

    expect(result.updated).toBe(1);
    expect(
      result.warnings.some((w) => w.includes('not found in canonical dataset'))
    ).toBe(true);
  });
});
