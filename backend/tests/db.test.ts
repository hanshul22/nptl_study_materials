import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { connectDb } from '../src/config/db.js';

describe('connectDb', () => {
  it('passes the 10s selection timeout and throws an error without the URI or driver message', async () => {
    const uri = 'mongodb+srv://user:s3cret-pw@cluster0.example.mongodb.net/db';
    const driverErr = Object.assign(new Error(`getaddrinfo ENOTFOUND cluster0.example.mongodb.net (${uri})`), {
      name: 'MongoServerSelectionError',
    });
    const connect = vi.spyOn(mongoose, 'connect').mockRejectedValue(driverErr);

    const err = await connectDb(uri).then(
      () => null,
      (e: unknown) => e as Error,
    );

    expect(connect).toHaveBeenCalledWith(uri, { serverSelectionTimeoutMS: 10000 });
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toContain('MongoServerSelectionError');
    expect(`${err?.message}${err?.stack}${String(err?.cause)}`).not.toMatch(/s3cret|cluster0|ENOTFOUND/);
  });
});
