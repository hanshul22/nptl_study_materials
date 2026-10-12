import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ApiError, ItemThreadQuery, ObjectIdStr, TopicCreate } from '@study/shared';
import { createApp } from '../src/app.js';
import { parseConfig } from '../src/config/env.js';
import { notFound } from '../src/middleware/notFound.js';
import { owner } from '../src/middleware/owner.js';
import { createRateLimiter } from '../src/middleware/rateLimit.js';
import { validate, type ValidatedLocals } from '../src/middleware/validate.js';
import { createLogger } from '../src/utils/logger.js';

const ORIGIN = 'http://localhost:5173';
const config = parseConfig({ MONGODB_URI: 'mongodb://fake/db', FRONTEND_ORIGIN: ORIGIN });

describe('helmet', () => {
  it('sets security headers', async () => {
    const res = await request(createApp(config)).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('cors', () => {
  const app = createApp(config);

  it('allows the configured origin and exposes Content-Disposition', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-expose-headers']).toBe('Content-Disposition');
  });

  it('gives another origin no CORS headers', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'http://evil.example');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers a preflight', async () => {
    const res = await request(app)
      .options('/api/v1/topics')
      .set('Origin', ORIGIN)
      .set('Access-Control-Request-Method', 'PATCH');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,PATCH,DELETE,OPTIONS');
  });
});

describe('owner', () => {
  it('sets req.ownerId to "local"', async () => {
    const app = express();
    app.use(owner);
    app.get('/who', (req, res) => {
      res.json({ ownerId: req.ownerId });
    });
    const res = await request(app).get('/who');
    expect(res.body).toEqual({ ownerId: 'local' });
  });
});

describe('validate', () => {
  const ID = 'a'.repeat(24);
  const Params = z.object({ topicId: ObjectIdStr });

  function makeApp() {
    const app = express();
    app.use(express.json());
    app.post(
      '/topics/:topicId',
      validate({ body: TopicCreate, query: ItemThreadQuery, params: Params }),
      (req, res) => {
        const { query, params } = res.locals as ValidatedLocals<
          z.output<typeof ItemThreadQuery>,
          z.output<typeof Params>
        >;
        res.json({ body: req.body, query, params });
      },
    );
    return app;
  }
  const goodQuery = { type: 'mcq', setId: ID, number: '3' };

  it('passes parsed body, query and params to the handler', async () => {
    const res = await request(makeApp())
      .post(`/topics/${ID}`)
      .query(goodQuery)
      .send({ name: '  Algebra  ' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      body: { name: 'Algebra' }, // trimmed by the schema
      query: { type: 'mcq', setId: ID, number: 3 }, // "3" coerced to 3
      params: { topicId: ID },
    });
  });

  it('returns a 400 ApiError with issue paths', async () => {
    const res = await request(makeApp()).post(`/topics/${ID}`).query(goodQuery).send({ name: '' });
    expect(res.status).toBe(400);
    const parsed = ApiError.parse(res.body);
    expect(parsed.error.code).toBe('VALIDATION_ERROR');
    expect(parsed.error.details).toHaveLength(1);
    expect(parsed.error.details?.[0]?.path).toEqual(['name']);
    expect(parsed.error.details?.[0]).not.toHaveProperty('code');
  });

  it('aggregates issues from body, query and params', async () => {
    const res = await request(makeApp()).post('/topics/not-an-id').query({ type: 'nope' }).send({});
    expect(res.status).toBe(400);
    const paths = ApiError.parse(res.body).error.details?.map((d) => d.path.join('.'));
    expect(paths).toContain('name');
    expect(paths).toContain('topicId');
    expect(paths?.length).toBeGreaterThanOrEqual(3); // name + query + topicId
  });

  it('fails when a body schema is set but no body was sent', async () => {
    const app = express();
    app.use(express.json());
    app.post('/x', validate({ body: TopicCreate }), (_req, res) => {
      res.json({});
    });
    const res = await request(app).post('/x');
    expect(res.status).toBe(400);
  });
});

describe('notFound', () => {
  it('returns the NOT_FOUND envelope for unknown routes', async () => {
    const res = await request(createApp(config)).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(ApiError.parse(res.body).error.code).toBe('NOT_FOUND');
    // the standalone handler behaves the same
    const bare = express().use(notFound);
    expect((await request(bare).get('/x')).body.error.code).toBe('NOT_FOUND');
  });
});

describe('rate limiter', () => {
  it('returns 429 RATE_LIMITED after the limit', async () => {
    const app = express();
    app.use(createRateLimiter({ limit: 2, windowMs: 60_000 }));
    app.get('/x', (_req, res) => {
      res.json({ ok: true });
    });
    expect((await request(app).get('/x')).status).toBe(200);
    expect((await request(app).get('/x')).status).toBe(200);
    const res = await request(app).get('/x');
    expect(res.status).toBe(429);
    expect(ApiError.parse(res.body).error.code).toBe('RATE_LIMITED');
    expect(res.headers['ratelimit']).toBeDefined(); // draft-7 header
    expect(res.headers['x-ratelimit-limit']).toBeUndefined(); // legacy headers off
  });
});

describe('logging', () => {
  function capture() {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'info',
      destination: { write: (s: string) => void lines.push(s) },
    });
    return { lines, app: createApp(config, { logger }) };
  }

  it('logs one line per request with method, path, status and time, and nothing sensitive', async () => {
    const { lines, app } = capture();
    await request(app)
      .post('/api/v1/health?token=query-secret')
      .set('Authorization', 'Bearer header-secret')
      .set('Cookie', 'sid=cookie-secret')
      .send({ content: 'body-secret' });

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] as string) as Record<string, unknown>;
    expect(entry).toMatchObject({
      req: { method: 'POST', path: '/api/v1/health' },
      res: { statusCode: 404 },
    });
    expect(typeof entry.responseTime).toBe('number');
    expect(lines[0]).not.toMatch(/header-secret|cookie-secret|body-secret|query-secret/);
  });

  it('is silent under NODE_ENV=test by default', async () => {
    expect(createLogger().level).toBe('silent');
  });

  it('redacts credentials if a caller logs them', () => {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'info',
      destination: { write: (s: string) => void lines.push(s) },
    });
    logger.info({
      req: { headers: { authorization: 'Bearer abc-secret', cookie: 'sid=xyz-secret' } },
      OPENROUTER_API_KEY: 'key-secret',
      config: { OPENROUTER_API_KEY: 'nested-key-secret' },
    });
    expect(lines[0]).not.toMatch(/abc-secret|xyz-secret|key-secret/);
    expect(lines[0]).toContain('[Redacted]');
  });
});
