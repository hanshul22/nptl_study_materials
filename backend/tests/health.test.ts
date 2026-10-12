import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { parseConfig } from '../src/config/env.js';

const config = parseConfig({ MONGODB_URI: 'mongodb://fake/db', FRONTEND_ORIGIN: 'http://localhost:5173' });

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp(config).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('GET /api/v1/health', () => {
  it('returns 200 { status: "ok" }', async () => {
    const res = await fetch(`${base}/api/v1/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('no longer serves /api/v1/ping', async () => {
    const res = await fetch(`${base}/api/v1/ping`);
    expect(res.status).toBe(404);
  });
});
