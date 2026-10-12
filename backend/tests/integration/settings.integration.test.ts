import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiError, Settings } from '@study/shared';
import { createApp } from '../../src/app.js';
import { parseConfig } from '../../src/config/env.js';
import { SettingsModel } from '../../src/models/settings.model.js';
import { useMemoryMongo } from '../helpers/mongo.js';

// Real repositories against an in-memory MongoDB; no fakes.
useMemoryMongo('settings_integration');

const SECRET = 'sk-or-test-secret-key-123';
const base = { MONGODB_URI: 'mongodb://unused/db', FRONTEND_ORIGIN: 'http://localhost:5173' };
const bare = createApp(parseConfig(base));
const withModel = createApp(parseConfig({ ...base, OPENROUTER_MODEL: 'vendor/model-x' }));
const withKey = createApp(parseConfig({ ...base, OPENROUTER_API_KEY: SECRET }));

const DEFAULTS = { model: 'openrouter/auto', maxChunks: 6, maxTokens: 1200, temperature: 0.2 };
const get = (app: typeof bare) => request(app).get('/api/v1/settings');
const patch = (app: typeof bare, body: unknown) =>
  request(app)
    .patch('/api/v1/settings')
    .send(body as object);
const stored = () => SettingsModel.find().lean();

describe('GET /settings', () => {
  it('returns the defaults when nothing is stored, and does not create a document', async () => {
    const res = await get(bare);
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toEqual({ ...DEFAULTS, aiConfigured: false });
    expect(await SettingsModel.countDocuments()).toBe(0);
  });

  it('takes the model from OPENROUTER_MODEL, and a stored model wins over it', async () => {
    expect(Settings.parse((await get(withModel)).body).model).toBe('vendor/model-x');
    await patch(withModel, { model: 'stored/model' });
    expect((await get(withModel)).body.model).toBe('stored/model');
  });
});

describe('PATCH /settings', () => {
  it('persists a partial update and a later GET reflects it', async () => {
    const res = await patch(bare, { temperature: 0.7 });
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toEqual({
      ...DEFAULTS,
      temperature: 0.7,
      aiConfigured: false,
    });

    const again = await get(bare);
    expect(Settings.parse(again.body)).toEqual({
      ...DEFAULTS,
      temperature: 0.7,
      aiConfigured: false,
    });
    const [doc] = await stored();
    expect(doc).toMatchObject({ ownerId: 'local', temperature: 0.7 });
    // only the provided field is stored
    expect(doc).not.toHaveProperty('model');
    expect(doc).not.toHaveProperty('maxChunks');
  });

  it('updates the same single document on later PATCHes', async () => {
    await patch(bare, { temperature: 0.7 });
    const [first] = await stored();
    const res = await patch(bare, { maxChunks: 9, model: 'a/b' });
    expect(Settings.parse(res.body)).toMatchObject({
      temperature: 0.7,
      maxChunks: 9,
      model: 'a/b',
    });

    const docs = await stored();
    expect(docs).toHaveLength(1);
    expect(String(docs[0]?._id)).toBe(String(first?._id));
    expect(docs[0]).toMatchObject({
      ownerId: 'local',
      temperature: 0.7,
      maxChunks: 9,
      model: 'a/b',
    });
  });

  it('changes nothing for an empty PATCH', async () => {
    const res = await patch(bare, {});
    expect(res.status).toBe(200);
    expect(Settings.parse(res.body)).toEqual({ ...DEFAULTS, aiConfigured: false });
    expect(await SettingsModel.countDocuments()).toBe(0);
  });

  it('keeps one document for concurrent first PATCHes of different fields', async () => {
    const results = await Promise.all([
      patch(bare, { maxChunks: 3 }),
      patch(bare, { maxTokens: 500 }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const docs = await stored();
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({ maxChunks: 3, maxTokens: 500 });
  });
});

describe('aiConfigured', () => {
  it('comes only from env and the key never appears in a response', async () => {
    expect(Settings.parse((await get(bare)).body).aiConfigured).toBe(false);

    const keyed = await get(withKey);
    expect(Settings.parse(keyed.body).aiConfigured).toBe(true);
    expect(keyed.text).not.toContain(SECRET);
  });

  it('ignores aiConfigured in a PATCH body and never stores it', async () => {
    const res = await patch(bare, { aiConfigured: true, temperature: 0.5 });
    expect(Settings.parse(res.body)).toMatchObject({ aiConfigured: false, temperature: 0.5 });
    expect((await stored())[0]).not.toHaveProperty('aiConfigured');

    const keyed = await patch(withKey, { aiConfigured: false });
    expect(Settings.parse(keyed.body).aiConfigured).toBe(true);
    expect(keyed.text).not.toContain(SECRET);
    expect(JSON.stringify(await stored())).not.toContain(SECRET);
  });
});

describe('validation', () => {
  it.each([
    ['maxChunks 13', { maxChunks: 13 }, 'maxChunks'],
    ['maxTokens 50', { maxTokens: 50 }, 'maxTokens'],
    ['temperature 1.5', { temperature: 1.5 }, 'temperature'],
    ['an empty model', { model: '' }, 'model'],
  ])('returns 400 VALIDATION_ERROR for %s and stores nothing', async (_label, body, field) => {
    const res = await patch(bare, body);
    expect(res.status).toBe(400);
    const error = ApiError.parse(res.body).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details?.[0]?.path).toEqual([field]);
    expect(await SettingsModel.countDocuments()).toBe(0);
  });
});
