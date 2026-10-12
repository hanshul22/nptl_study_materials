import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, Settings } from '@study/shared';
import { createApp } from '../src/app.js';
import { parseConfig } from '../src/config/env.js';
import type { SettingsDoc } from '../src/models/settings.model.js';

// In-memory stand-in for the repository: no database is needed (mongodb-memory-server arrives in B1.7).
const store = vi.hoisted(() => ({ doc: null as SettingsDoc | null, upserts: 0 }));

vi.mock('../src/repositories/settings.repository.js', async () => {
  const { Types } = await import('mongoose');
  const settingsRepository = {
    find: (ownerId: string) => Promise.resolve(store.doc?.ownerId === ownerId ? store.doc : null),
    upsert: (ownerId: string, patch: object) => {
      const now = new Date();
      store.upserts += 1;
      store.doc = {
        _id: new Types.ObjectId(),
        createdAt: now,
        ...store.doc,
        ownerId,
        ...patch,
        updatedAt: now,
      };
      return Promise.resolve(store.doc);
    },
  };
  return { settingsRepository };
});

const SECRET = 'sk-or-test-secret-key-123';
const base = { MONGODB_URI: 'mongodb://fake/db', FRONTEND_ORIGIN: 'http://localhost:5173' };
const bare = createApp(parseConfig(base));
const withModel = createApp(parseConfig({ ...base, OPENROUTER_MODEL: 'vendor/model-x' }));
const withKey = createApp(parseConfig({ ...base, OPENROUTER_API_KEY: SECRET }));

const DEFAULTS = { model: 'openrouter/auto', maxChunks: 6, maxTokens: 1200, temperature: 0.2 };

function expectError(body: unknown, code: string) {
  const parsed = ApiError.parse(body); // every error body is a valid envelope
  expect(parsed.error.code).toBe(code);
  return parsed.error;
}

beforeEach(() => {
  store.doc = null;
  store.upserts = 0;
});

describe('GET /settings', () => {
  it('returns the defaults when nothing is stored', async () => {
    const res = await request(bare).get('/api/v1/settings');
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toEqual({ ...DEFAULTS, aiConfigured: false });
  });

  it('takes the model from OPENROUTER_MODEL when it is set', async () => {
    const res = await request(withModel).get('/api/v1/settings');
    expect(Settings.parse(res.body).model).toBe('vendor/model-x');
  });

  it('falls back to "openrouter/auto" when OPENROUTER_MODEL is unset', async () => {
    const res = await request(bare).get('/api/v1/settings');
    expect(res.body.model).toBe('openrouter/auto');
  });

  it('prefers a stored model over OPENROUTER_MODEL', async () => {
    await request(withModel).patch('/api/v1/settings').send({ model: 'stored/model' });
    const res = await request(withModel).get('/api/v1/settings');
    expect(res.body.model).toBe('stored/model');
  });

  it('computes aiConfigured from the key and never returns the key', async () => {
    const without = await request(bare).get('/api/v1/settings');
    expect(Settings.parse(without.body).aiConfigured).toBe(false);

    const withIt = await request(withKey).get('/api/v1/settings');
    expect(Settings.parse(withIt.body).aiConfigured).toBe(true);
    expect(withIt.text).not.toContain(SECRET);
    expect(Object.keys(withIt.body).sort()).toEqual(Object.keys(Settings.shape).sort());
  });
});

describe('PATCH /settings', () => {
  it('keeps the other fields when only temperature is sent, and a later GET reflects it', async () => {
    const res = await request(bare).patch('/api/v1/settings').send({ temperature: 0.7 });
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toEqual({
      ...DEFAULTS,
      temperature: 0.7,
      aiConfigured: false,
    });

    const again = await request(bare).get('/api/v1/settings');
    expect(Settings.parse(again.body)).toEqual({
      ...DEFAULTS,
      temperature: 0.7,
      aiConfigured: false,
    });
    expect(store.doc?.ownerId).toBe('local');
  });

  it('accumulates separate PATCHes', async () => {
    await request(bare).patch('/api/v1/settings').send({ maxChunks: 9 });
    const res = await request(bare).patch('/api/v1/settings').send({ maxTokens: 2000 });
    expect(Settings.parse(res.body)).toMatchObject({ maxChunks: 9, maxTokens: 2000 });
  });

  it('changes nothing for an empty PATCH', async () => {
    const res = await request(bare).patch('/api/v1/settings').send({});
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toEqual({ ...DEFAULTS, aiConfigured: false });
    expect(store.upserts).toBe(0);
  });

  it('ignores aiConfigured in the body: it always comes from env', async () => {
    const res = await request(bare)
      .patch('/api/v1/settings')
      .send({ aiConfigured: true, temperature: 0.5 });
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toMatchObject({ aiConfigured: false, temperature: 0.5 });
    expect(store.doc).not.toHaveProperty('aiConfigured');

    const keyed = await request(withKey).patch('/api/v1/settings').send({ aiConfigured: false });
    expect(Settings.parse(keyed.body).aiConfigured).toBe(true);
    expect(keyed.text).not.toContain(SECRET);
  });

  it.each([
    ['maxChunks 13', { maxChunks: 13 }, 'maxChunks'],
    ['maxChunks 0', { maxChunks: 0 }, 'maxChunks'],
    ['maxTokens 50', { maxTokens: 50 }, 'maxTokens'],
    ['temperature 1.5', { temperature: 1.5 }, 'temperature'],
    ['an empty model', { model: '' }, 'model'],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, body, field) => {
    const res = await request(bare).patch('/api/v1/settings').send(body);
    expect(res.status).toBe(400);
    const error = expectError(res.body, 'VALIDATION_ERROR');
    expect(error.details?.[0]?.path).toEqual([field]);
    expect(store.upserts).toBe(0);
  });

  it('returns 400 VALIDATION_ERROR when the body is missing', async () => {
    const res = await request(bare).patch('/api/v1/settings');
    expect(res.status).toBe(400);
    expectError(res.body, 'VALIDATION_ERROR');
  });
});
