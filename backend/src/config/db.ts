import mongoose from 'mongoose';

/** Never carries the URI or the driver message (which can echo host/credentials) and has no `cause`. */
export class DbConnectionError extends Error {
  constructor(driverErrorName: string) {
    super(`MongoDB connection failed (${driverErrorName})`);
    this.name = 'DbConnectionError';
  }
}

export async function connectDb(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    throw new DbConnectionError(err instanceof Error ? err.name : 'UnknownError');
  }
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
