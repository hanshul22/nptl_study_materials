import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { SettingsModel } from '../../src/models/settings.model.js';
import { TopicModel } from '../../src/models/topic.model.js';

/** Removes every document but keeps the indexes. */
export async function clearCollections(): Promise<void> {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

/**
 * Registers hooks that run an in-memory MongoDB for the calling test file:
 * start it, connect mongoose with the app's own `connectDb`, build the unique indexes,
 * empty the collections before each test and stop everything afterwards.
 * `dbName` keeps one database per test file. Never touches backend/.env or Atlas.
 * The first start can download the MongoDB binary, hence the long hook timeout.
 */
export function useMemoryMongo(dbName: string): void {
  let server: MongoMemoryServer | undefined;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    await connectDb(server.getUri(dbName));
    await Promise.all([TopicModel.init(), SettingsModel.init()]);
  }, 60_000);

  beforeEach(clearCollections);

  afterAll(async () => {
    await disconnectDb();
    await server?.stop();
  }, 60_000);
}
