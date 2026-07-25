import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { migrateComputerScienceFaculty } from '../scripts/migrateComputerScienceFaculty';

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
  await mongoose.connection.db!.collection('Users_2').deleteMany({});
});

describe('migrateComputerScienceFaculty', () => {
  it('moves a Physical Sciences Computer Science record to Faculty of Computing', async () => {
    const db = mongoose.connection.db!;
    const userId = new mongoose.Types.ObjectId();
    await db.collection('Users_2').insertOne({
      _id: userId,
      name: 'CS Lecturer',
      faculty: 'Faculty of Physical Sciences',
      department: 'Department of Computer Science',
    });

    const result = await migrateComputerScienceFaculty(db);

    expect(result.updated).toBe(1);
    const migrated = await db.collection('Users_2').findOne({ _id: userId });
    expect(migrated?.faculty).toBe('Faculty of Computing');
    expect(migrated?.department).toBe('Department of Computer Science');
    expect(result.warnings).toHaveLength(0);
  });

  it('normalizes an un-prefixed "Computer Science" department title', async () => {
    const db = mongoose.connection.db!;
    const userId = new mongoose.Types.ObjectId();
    await db.collection('Users_2').insertOne({
      _id: userId,
      name: 'Legacy CS',
      faculty: 'Faculty of Physical Sciences',
      department: 'Computer Science',
    });

    const result = await migrateComputerScienceFaculty(db);

    expect(result.updated).toBe(1);
    const migrated = await db.collection('Users_2').findOne({ _id: userId });
    expect(migrated?.faculty).toBe('Faculty of Computing');
    expect(migrated?.department).toBe('Department of Computer Science');
  });

  it('leaves non-Computer-Science records untouched', async () => {
    const db = mongoose.connection.db!;
    const userId = new mongoose.Types.ObjectId();
    await db.collection('Users_2').insertOne({
      _id: userId,
      name: 'Chemistry Lecturer',
      faculty: 'Faculty of Physical Sciences',
      department: 'Department of Chemistry',
    });

    const result = await migrateComputerScienceFaculty(db);

    expect(result.updated).toBe(0);
    const untouched = await db.collection('Users_2').findOne({ _id: userId });
    expect(untouched?.faculty).toBe('Faculty of Physical Sciences');
  });

  it('is idempotent — already-migrated records are skipped', async () => {
    const db = mongoose.connection.db!;
    await db.collection('Users_2').insertOne({
      _id: new mongoose.Types.ObjectId(),
      name: 'Already Moved',
      faculty: 'Faculty of Computing',
      department: 'Department of Computer Science',
    });

    const result = await migrateComputerScienceFaculty(db);

    expect(result.scanned).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('warns and does not change a CS record with an unexpected faculty', async () => {
    const db = mongoose.connection.db!;
    const userId = new mongoose.Types.ObjectId();
    await db.collection('Users_2').insertOne({
      _id: userId,
      name: 'Odd CS',
      faculty: 'Faculty of Law',
      department: 'Department of Computer Science',
    });

    const result = await migrateComputerScienceFaculty(db);

    expect(result.updated).toBe(0);
    expect(result.warnings.some((w) => w.includes('unexpected faculty'))).toBe(
      true
    );
    const untouched = await db.collection('Users_2').findOne({ _id: userId });
    expect(untouched?.faculty).toBe('Faculty of Law');
  });
});
