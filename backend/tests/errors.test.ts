import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@study/shared';
import { createApp } from '../src/app.js';
import { parseConfig } from '../src/config/env.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestLogger } from '../src/middleware/requestLogger.js';
import { AppError } from '../src/utils/AppError.js';
import { createLogger } from '../src/utils/logger.js';

const config = parseConfig({
  MONGODB_URI: 'mongodb://fake/db',
  FRONTEND_ORIGIN: 'http://localhost:5173',
});

describe('AppError', () => {
  it('maps the code to its HTTP status and keeps details', () => {
    const details = [{ path: ['name'], message: 'taken' }];
    const err = new AppError('DUPLICATE_TOPIC', 'Topic exists', details);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('AppError');
    expect(err.code).toBe('DUPLICATE_TOPIC');
    expect(err.status).toBe(409);
    expect(err.details).toEqual(details);
    expect(err.cause).toBeUndefined();
  });
});

describe('body-parser errors through createApp', () => {
  const app = createApp(config);

  it('returns 400 VALIDATION_ERROR for malformed JSON, without the parser message', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send('{"name": ');
    expect(res.status).toBe(400);
    expect(ApiError.parse(res.body)).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' },
    });
    expect(res.text).not.toMatch(/Unexpected|JSON at position/);
  });

  it('returns 413 FILE_TOO_LARGE for a body over 2 MB', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ content: 'x'.repeat(3 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(ApiError.parse(res.body)).toEqual({
      error: { code: 'FILE_TOO_LARGE', message: 'Request body is too large (max 2 MB)' },
    });
  });

  it('returns 400 for another 4xx body-parser error (unsupported encoding)', async () => {
    const res = await request(app)
      .post('/api/v1/anything')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'bogus')
      .send('{}');
    expect(res.status).toBe(400);
    expect(ApiError.parse(res.body).error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request body could not be read',
    });
  });

  it('still returns the NOT_FOUND envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(ApiError.parse(res.body).error.code).toBe('NOT_FOUND');
  });
});

describe('errorHandler', () => {
  const lines: string[] = [];
  let lateError: unknown;
  // Runs after errorHandler: only reached when it delegates with next(err).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs 4 parameters
  const afterHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    lateError = err;
    res.end();
  };

  const app = express();
  app.use(
    requestLogger(
      createLogger({ level: 'info', destination: { write: (s: string) => void lines.push(s) } }),
    ),
  );
  app.get('/app-error', () => {
    throw new AppError('MCQ_IMPORT_INVALID', 'Import failed', [
      { path: ['questions', 3, 'answer'], message: 'bad letter', code: 'X' },
    ]);
  });
  app.get('/plain', () => {
    throw new Error('secret detail');
  });
  app.get('/async', async () => {
    await Promise.resolve();
    throw new AppError('NOT_FOUND', 'Topic not found');
  });
  app.get('/late', (_req, res) => {
    res.write('partial');
    throw new Error('late failure');
  });
  app.get('/ok', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  app.use(afterHandler);

  it('sends an AppError with its status, code and details', async () => {
    const res = await request(app).get('/app-error');
    expect(res.status).toBe(422);
    expect(ApiError.parse(res.body).error).toEqual({
      code: 'MCQ_IMPORT_INVALID',
      message: 'Import failed',
      details: [{ path: ['questions', 3, 'answer'], message: 'bad letter', code: 'X' }],
    });
  });

  it('hides unexpected errors behind a generic 500 and logs them', async () => {
    const res = await request(app).get('/plain');
    expect(res.status).toBe(500);
    expect(ApiError.parse(res.body).error).toEqual({
      code: 'INTERNAL',
      message: 'Something went wrong',
    });
    expect(res.text).not.toContain('secret detail');
    expect(res.text).not.toContain('at ');
    const logged = lines.find((l) => l.includes('Unhandled error'));
    expect(logged).toContain('secret detail'); // detail and stack stay in the logs
  });

  it('catches a rejected async handler (Express 5)', async () => {
    const res = await request(app).get('/async');
    expect(res.status).toBe(404);
    expect(ApiError.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('delegates with next(err) after headers are sent and keeps serving', async () => {
    const res = await request(app).get('/late');
    expect(res.status).toBe(200);
    expect(res.text).toBe('partial');
    expect(lateError).toMatchObject({ message: 'late failure' });
    expect((await request(app).get('/ok')).status).toBe(200);
  });
});
