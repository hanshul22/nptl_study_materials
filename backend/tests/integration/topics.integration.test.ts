import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiError, Topic } from '@study/shared';
import { createApp } from '../../src/app.js';
import { parseConfig } from '../../src/config/env.js';
import { TopicModel } from '../../src/models/topic.model.js';
import { useMemoryMongo } from '../helpers/mongo.js';

// Real repositories against an in-memory MongoDB; no fakes.
useMemoryMongo('topics_integration');

const app = createApp(
  parseConfig({ MONGODB_URI: 'mongodb://unused/db', FRONTEND_ORIGIN: 'http://localhost:5173' }),
);
const MISSING_ID = 'a'.repeat(24);

const post = (body: unknown) =>
  request(app)
    .post('/api/v1/topics')
    .send(body as object);
const stored = () => TopicModel.find().sort({ _id: 1 }).lean();

function expectError(body: unknown, code: string) {
  const parsed = ApiError.parse(body); // every error body is a valid envelope
  expect(parsed.error.code).toBe(code);
  return parsed.error;
}

describe('create', () => {
  it('returns 201 with a Topic that parses with the shared schema', async () => {
    const res = await post({ name: '  Math  ', description: ' Numbers ' });
    expect(res.status).toBe(201);
    expect(Topic.parse(res.body)).toMatchObject({
      name: 'Math',
      description: 'Numbers',
      documentCount: 0,
      noteCount: 0,
      mcqSetCount: 0,
    });
    const [doc] = await stored();
    expect(doc).toMatchObject({ ownerId: 'local', name: 'Math', nameLower: 'math' });
    expect(String(doc?._id)).toBe(res.body.id);
  });

  it('stores an empty description as null', async () => {
    const res = await post({ name: 'Math', description: '' });
    expect(res.body.description).toBeNull();
    expect((await stored())[0]?.description).toBeNull();
  });

  it.each(['math', 'MATH', ' Math '])(
    'rejects a duplicate name written as %j with 409',
    async (dup) => {
      await post({ name: 'Math' });
      const res = await post({ name: dup });
      expect(res.status).toBe(409);
      expectError(res.body, 'DUPLICATE_TOPIC');
      expect(await TopicModel.countDocuments()).toBe(1);
    },
  );

  it('allows the same name for a different owner (index is per owner)', async () => {
    await TopicModel.create({ ownerId: 'other', name: 'Math', nameLower: 'math' });
    const res = await post({ name: 'Math' });
    expect(res.status).toBe(201);
    expect(await TopicModel.countDocuments()).toBe(2);
  });

  it('returns 400 VALIDATION_ERROR for an invalid body and stores nothing', async () => {
    for (const body of [{ name: '' }, { name: 'x'.repeat(101) }, {}]) {
      const res = await post(body);
      expect(res.status).toBe(400);
      expectError(res.body, 'VALIDATION_ERROR');
    }
    expect(await TopicModel.countDocuments()).toBe(0);
  });
});

describe('list', () => {
  it('returns an empty array when there are no topics', async () => {
    const res = await request(app).get('/api/v1/topics');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('orders by createdAt ascending, regardless of insertion order (D-090)', async () => {
    const day = (d: number) => new Date(`2026-01-0${d}T00:00:00.000Z`);
    for (const [name, createdAt] of [
      ['Chemistry', day(3)],
      ['Algebra', day(1)],
      ['Biology', day(2)],
    ] as const) {
      await TopicModel.create({ ownerId: 'local', name, nameLower: name.toLowerCase(), createdAt });
    }
    const res = await request(app).get('/api/v1/topics');
    expect(
      Topic.array()
        .parse(res.body)
        .map((t) => t.name),
    ).toEqual(['Algebra', 'Biology', 'Chemistry']);
  });

  it('lists topics created through the API in creation order', async () => {
    for (const name of ['One', 'Two', 'Three']) await post({ name });
    const res = await request(app).get('/api/v1/topics');
    expect(
      Topic.array()
        .parse(res.body)
        .map((t) => t.name),
    ).toEqual(['One', 'Two', 'Three']);
  });

  it("never lists another owner's topics", async () => {
    await TopicModel.create({ ownerId: 'other', name: 'Secret', nameLower: 'secret' });
    await post({ name: 'Mine' });
    const res = await request(app).get('/api/v1/topics');
    expect(res.body.map((t: Topic) => t.name)).toEqual(['Mine']);
  });

  it('never exposes ownerId, _id or nameLower', async () => {
    await post({ name: 'Math' });
    const res = await request(app).get('/api/v1/topics');
    expect(Object.keys(res.body[0]).sort()).toEqual(Object.keys(Topic.shape).sort());
    expect(res.text).not.toMatch(/ownerId|_id|nameLower|__v/);
  });
});

describe('update', () => {
  async function seed(name: string, description?: string) {
    return Topic.parse((await post({ name, description })).body);
  }
  const patch = (id: string, body: unknown) =>
    request(app)
      .patch(`/api/v1/topics/${id}`)
      .send(body as object);

  it("stores description '' as null and a later GET shows null", async () => {
    const topic = await seed('Math', 'Numbers');
    const res = await patch(topic.id, { description: '' });
    expect(res.status).toBe(200);
    expect(Topic.parse(res.body).description).toBeNull();
    expect((await stored())[0]?.description).toBeNull();

    const list = await request(app).get('/api/v1/topics');
    expect(list.body[0].description).toBeNull();
  });

  it('recomputes nameLower on rename and bumps updatedAt', async () => {
    const topic = await seed('Math');
    await new Promise((r) => setTimeout(r, 5));
    const res = await patch(topic.id, { name: 'Geometry' });
    expect(Topic.parse(res.body).name).toBe('Geometry');
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
      new Date(topic.updatedAt).getTime(),
    );
    expect(res.body.createdAt).toBe(topic.createdAt);
    expect((await stored())[0]).toMatchObject({ name: 'Geometry', nameLower: 'geometry' });
  });

  it('allows changing only the case of its own name', async () => {
    const topic = await seed('Math');
    const res = await patch(topic.id, { name: 'MATH' });
    expect(res.status).toBe(200);
    expect((await stored())[0]).toMatchObject({ name: 'MATH', nameLower: 'math' });
  });

  it('returns 409 DUPLICATE_TOPIC when renaming onto an existing name', async () => {
    await seed('Math');
    const physics = await seed('Physics');
    const res = await patch(physics.id, { name: 'mATh' });
    expect(res.status).toBe(409);
    expectError(res.body, 'DUPLICATE_TOPIC');
    expect((await stored())[1]).toMatchObject({ name: 'Physics', nameLower: 'physics' });
  });

  it('returns the topic unchanged for an empty PATCH', async () => {
    const topic = await seed('Math', 'Numbers');
    const res = await patch(topic.id, {});
    expect(res.status).toBe(200);
    expect(res.body).toEqual(topic);
  });

  it('returns 404 NOT_FOUND for an unknown id, with and without fields', async () => {
    for (const body of [{ name: 'X' }, {}]) {
      const res = await patch(MISSING_ID, body);
      expect(res.status).toBe(404);
      expectError(res.body, 'NOT_FOUND');
    }
    expect(await TopicModel.countDocuments()).toBe(0); // no upsert side effect
  });

  it("cannot touch another owner's topic", async () => {
    const other = await TopicModel.create({
      ownerId: 'other',
      name: 'Secret',
      nameLower: 'secret',
    });
    const res = await patch(String(other._id), { name: 'Hacked' });
    expect(res.status).toBe(404);
    expect((await TopicModel.findById(other._id).lean())?.name).toBe('Secret');
  });

  it('returns 400 VALIDATION_ERROR for a malformed id', async () => {
    const res = await patch('not-an-id', { name: 'X' });
    expect(res.status).toBe(400);
    expectError(res.body, 'VALIDATION_ERROR');
  });
});

describe('delete', () => {
  it('returns 204, then 404 on the second attempt', async () => {
    const created = await post({ name: 'Math' });
    const first = await request(app).delete(`/api/v1/topics/${created.body.id}`);
    expect(first.status).toBe(204);
    expect(first.text).toBe('');
    expect(await TopicModel.countDocuments()).toBe(0);

    const second = await request(app).delete(`/api/v1/topics/${created.body.id}`);
    expect(second.status).toBe(404);
    expectError(second.body, 'NOT_FOUND');
  });

  it("cannot delete another owner's topic", async () => {
    const other = await TopicModel.create({
      ownerId: 'other',
      name: 'Secret',
      nameLower: 'secret',
    });
    const res = await request(app).delete(`/api/v1/topics/${String(other._id)}`);
    expect(res.status).toBe(404);
    expect(await TopicModel.countDocuments()).toBe(1);
  });

  it('returns 400 VALIDATION_ERROR for a malformed id', async () => {
    const res = await request(app).delete('/api/v1/topics/123');
    expect(res.status).toBe(400);
    expectError(res.body, 'VALIDATION_ERROR');
  });

  it('frees the name for reuse', async () => {
    const created = await post({ name: 'Math' });
    await request(app).delete(`/api/v1/topics/${created.body.id}`);
    expect((await post({ name: 'math' })).status).toBe(201);
  });
});

describe('error envelope through the real app', () => {
  it('returns 400 VALIDATION_ERROR for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/v1/topics')
      .set('Content-Type', 'application/json')
      .send('{"name": ');
    expect(res.status).toBe(400);
    expect(ApiError.parse(res.body).error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request body is not valid JSON',
    });
  });

  it('returns 413 FILE_TOO_LARGE for a body over 2 MB', async () => {
    const res = await request(app)
      .post('/api/v1/topics')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'x'.repeat(3 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expectError(res.body, 'FILE_TOO_LARGE');
  });

  it('returns 404 NOT_FOUND for an unknown route', async () => {
    for (const path of ['/api/v1/nope', '/nope']) {
      const res = await request(app).get(path);
      expect(res.status).toBe(404);
      expectError(res.body, 'NOT_FOUND');
    }
  });
});
