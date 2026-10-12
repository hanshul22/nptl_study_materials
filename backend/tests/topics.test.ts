import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, Topic } from '@study/shared';
import { createApp } from '../src/app.js';
import { parseConfig } from '../src/config/env.js';
import type { TopicDoc } from '../src/models/topic.model.js';

// In-memory stand-in for the repository: no database is needed (mongodb-memory-server arrives in B1.7).
const store = vi.hoisted(() => ({ docs: [] as TopicDoc[] }));

vi.mock('../src/repositories/topics.repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/repositories/topics.repository.js')>();
  const { Types } = await import('mongoose');
  const mine = (ownerId: string, id: string) =>
    store.docs.find((d) => d.ownerId === ownerId && d._id.toString() === id);
  const clash = (ownerId: string, nameLower: string, exceptId?: string) =>
    store.docs.some(
      (d) => d.ownerId === ownerId && d.nameLower === nameLower && d._id.toString() !== exceptId,
    );

  const topicsRepository: typeof actual.topicsRepository = {
    list: (ownerId) => Promise.resolve(store.docs.filter((d) => d.ownerId === ownerId)),
    findById: (ownerId, id) => Promise.resolve(mine(ownerId, id) ?? null),
    create: (ownerId, data) => {
      if (clash(ownerId, data.nameLower)) return Promise.reject(new actual.DuplicateKeyError());
      const now = new Date();
      const doc: TopicDoc = {
        _id: new Types.ObjectId(),
        ownerId,
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      store.docs.push(doc);
      return Promise.resolve(doc);
    },
    update: (ownerId, id, patch) => {
      const doc = mine(ownerId, id);
      if (!doc) return Promise.resolve(null);
      if (patch.nameLower && clash(ownerId, patch.nameLower, id)) {
        return Promise.reject(new actual.DuplicateKeyError());
      }
      Object.assign(doc, patch, { updatedAt: new Date(Date.now() + 1) });
      return Promise.resolve(doc);
    },
    remove: (ownerId, id) => {
      const doc = mine(ownerId, id);
      if (doc) store.docs.splice(store.docs.indexOf(doc), 1);
      return Promise.resolve(Boolean(doc));
    },
  };
  return { ...actual, topicsRepository };
});

const config = parseConfig({
  MONGODB_URI: 'mongodb://fake/db',
  FRONTEND_ORIGIN: 'http://localhost:5173',
});
const app = createApp(config);
const MISSING_ID = 'a'.repeat(24);

async function createTopic(body: object) {
  return request(app).post('/api/v1/topics').send(body);
}

function expectError(body: unknown, code: string) {
  const parsed = ApiError.parse(body); // every error body is a valid envelope
  expect(parsed.error.code).toBe(code);
  return parsed.error;
}

beforeEach(() => {
  store.docs.length = 0;
});

describe('POST /topics', () => {
  it('returns 201 with a Topic that parses with the shared schema', async () => {
    const res = await createTopic({ name: '  Algebra  ', description: ' Basics ' });
    expect(res.status).toBe(201);
    expect(Topic.parse(res.body)).toMatchObject({
      name: 'Algebra',
      description: 'Basics',
      documentCount: 0,
      noteCount: 0,
      mcqSetCount: 0,
    });
  });

  it('returns description null when none was sent, and never exposes internals', async () => {
    const res = await createTopic({ name: 'Algebra' });
    expect(res.body.description).toBeNull();
    expect(Object.keys(res.body).sort()).toEqual(Object.keys(Topic.shape).sort());
    expect(store.docs[0]?.ownerId).toBe('local');
  });

  it('rejects a duplicate name case-insensitively with 409 DUPLICATE_TOPIC', async () => {
    await createTopic({ name: 'Algebra' });
    const res = await createTopic({ name: ' ALGEBRA ' });
    expect(res.status).toBe(409);
    expectError(res.body, 'DUPLICATE_TOPIC');
    expect(store.docs).toHaveLength(1);
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a blank name', { name: '   ' }],
    ['a name over 100 characters', { name: 'x'.repeat(101) }],
    ['a description over 500 characters', { name: 'ok', description: 'x'.repeat(501) }],
    ['a missing name', {}],
  ])('returns 400 VALIDATION_ERROR for %s', async (_label, body) => {
    const res = await createTopic(body);
    expect(res.status).toBe(400);
    expect(expectError(res.body, 'VALIDATION_ERROR').details?.length).toBeGreaterThan(0);
    expect(store.docs).toHaveLength(0);
  });
});

describe('GET /topics', () => {
  it('returns an empty array, then the created topics in creation order', async () => {
    const empty = await request(app).get('/api/v1/topics');
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);

    await createTopic({ name: 'Algebra' });
    await createTopic({ name: 'Biology' });
    const res = await request(app).get('/api/v1/topics');
    const topics = Topic.array().parse(res.body);
    expect(topics.map((t) => t.name)).toEqual(['Algebra', 'Biology']);
  });
});

describe('PATCH /topics/:topicId', () => {
  async function seed(name = 'Algebra', description?: string) {
    const res = await createTopic({ name, description });
    return Topic.parse(res.body);
  }

  it("stores description '' as null", async () => {
    const topic = await seed('Algebra', 'Basics');
    const res = await request(app).patch(`/api/v1/topics/${topic.id}`).send({ description: '' });
    expect(res.status).toBe(200);
    expect(Topic.parse(res.body).description).toBeNull();
    expect(store.docs[0]?.description).toBeNull();
  });

  it('renames a topic and recomputes nameLower', async () => {
    const topic = await seed('Algebra');
    const res = await request(app).patch(`/api/v1/topics/${topic.id}`).send({ name: 'Geometry' });
    expect(Topic.parse(res.body).name).toBe('Geometry');
    expect(store.docs[0]?.nameLower).toBe('geometry');
  });

  it('allows changing only the case of its own name', async () => {
    const topic = await seed('Algebra');
    const res = await request(app).patch(`/api/v1/topics/${topic.id}`).send({ name: 'ALGEBRA' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('ALGEBRA');
  });

  it('returns 409 DUPLICATE_TOPIC when renaming onto another topic', async () => {
    await seed('Algebra');
    const other = await seed('Biology');
    const res = await request(app).patch(`/api/v1/topics/${other.id}`).send({ name: 'algebra' });
    expect(res.status).toBe(409);
    expectError(res.body, 'DUPLICATE_TOPIC');
    expect(store.docs[1]?.name).toBe('Biology');
  });

  it('returns the topic unchanged for an empty PATCH', async () => {
    const topic = await seed('Algebra', 'Basics');
    const res = await request(app).patch(`/api/v1/topics/${topic.id}`).send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual(topic);
  });

  it('returns 404 NOT_FOUND for an unknown id, also for an empty PATCH', async () => {
    for (const body of [{ name: 'X' }, {}]) {
      const res = await request(app).patch(`/api/v1/topics/${MISSING_ID}`).send(body);
      expect(res.status).toBe(404);
      expectError(res.body, 'NOT_FOUND');
    }
  });

  it('returns 400 VALIDATION_ERROR for a malformed :topicId', async () => {
    const res = await request(app).patch('/api/v1/topics/not-an-id').send({ name: 'X' });
    expect(res.status).toBe(400);
    const error = expectError(res.body, 'VALIDATION_ERROR');
    expect(error.details?.[0]?.path).toEqual(['topicId']);
  });

  it('returns 400 VALIDATION_ERROR for an invalid body', async () => {
    const topic = await seed('Algebra');
    const res = await request(app).patch(`/api/v1/topics/${topic.id}`).send({ name: '' });
    expect(res.status).toBe(400);
    expectError(res.body, 'VALIDATION_ERROR');
  });
});

describe('DELETE /topics/:topicId', () => {
  it('returns 204 with no body and removes the topic', async () => {
    const created = await createTopic({ name: 'Algebra' });
    const res = await request(app).delete(`/api/v1/topics/${created.body.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect((await request(app).get('/api/v1/topics')).body).toEqual([]);
  });

  it('returns 404 NOT_FOUND for an unknown id', async () => {
    const res = await request(app).delete(`/api/v1/topics/${MISSING_ID}`);
    expect(res.status).toBe(404);
    expectError(res.body, 'NOT_FOUND');
  });

  it('returns 400 VALIDATION_ERROR for a malformed :topicId', async () => {
    const res = await request(app).delete('/api/v1/topics/123');
    expect(res.status).toBe(400);
    expectError(res.body, 'VALIDATION_ERROR');
  });
});
