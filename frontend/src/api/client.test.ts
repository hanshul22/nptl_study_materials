import { ENDPOINTS } from '@study/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiClientError } from './errors';

const BASE = 'http://api.test/api/v1';
const ID = '507f1f77bcf86cd799439011';

const topic = {
  id: ID,
  name: 'Operating Systems',
  description: null,
  documentCount: 0,
  noteCount: 0,
  mcqSetCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function setup(validate = true) {
  const fetchImpl = vi.fn<typeof fetch>();
  const request = createApiClient({ baseUrl: BASE, validate, fetchImpl });
  const lastCall = () => {
    const [url, init] = fetchImpl.mock.lastCall ?? [];
    return { url: String(url), init: init ?? {} };
  };
  return { fetchImpl, request, lastCall };
}

afterEach(() => vi.restoreAllMocks());

describe('URL building', () => {
  it('fills and URL-encodes path params', async () => {
    const { request, fetchImpl, lastCall } = setup();
    fetchImpl.mockResolvedValueOnce(json(200, topic));
    await request(ENDPOINTS.updateTopic, { params: { topicId: 'a b/c' }, body: { name: 'X' } });
    expect(lastCall().url).toBe(`${BASE}/topics/a%20b%2Fc`);
    expect(lastCall().init.method).toBe('PATCH');
  });

  it('throws a programming error when a param is missing', async () => {
    const { request, fetchImpl } = setup();
    await expect(request(ENDPOINTS.updateTopic, { body: {} })).rejects.toThrow(
      'Missing path param ":topicId"',
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('serializes query and skips undefined values', async () => {
    const { request, fetchImpl, lastCall } = setup();
    fetchImpl.mockResolvedValueOnce(json(200, { threadId: null, messages: [] }));
    await request(ENDPOINTS.getItemThread, {
      params: { topicId: ID },
      query: { type: 'mcq', setId: ID, number: 3, skipped: undefined },
    });
    expect(lastCall().url).toBe(`${BASE}/topics/${ID}/items/thread?type=mcq&setId=${ID}&number=3`);
  });

  it('adds no "?" without query', async () => {
    const { request, fetchImpl, lastCall } = setup();
    fetchImpl.mockResolvedValueOnce(json(200, [topic]));
    await request(ENDPOINTS.listTopics, { query: { q: undefined } });
    expect(lastCall().url).toBe(`${BASE}/topics`);
  });
});

describe('request body', () => {
  it('sends JSON with Content-Type', async () => {
    const { request, fetchImpl, lastCall } = setup();
    fetchImpl.mockResolvedValueOnce(json(201, topic));
    await request(ENDPOINTS.createTopic, { body: { name: 'Operating Systems' } });
    const { init } = lastCall();
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(init.body).toBe(JSON.stringify({ name: 'Operating Systems' }));
  });

  it('sends FormData as-is without Content-Type', async () => {
    const { request, fetchImpl, lastCall } = setup(false);
    fetchImpl.mockResolvedValueOnce(json(202, {}));
    const form = new FormData();
    form.append('file', new Blob(['%PDF'], { type: 'application/pdf' }), 'a.pdf');
    await request(ENDPOINTS.uploadDocument, { params: { topicId: ID }, body: form });
    const { init } = lastCall();
    expect(init.body).toBe(form);
    expect(init.headers).toBeUndefined();
  });

  it('validates the request body in dev before the network call', async () => {
    const { request, fetchImpl } = setup(true);
    const err = await request(ENDPOINTS.createTopic, { body: { name: '' } }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(ApiClientError);
    expect(err.message).toContain('Invalid request body for POST /topics');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips request validation when validate is false', async () => {
    const { request, fetchImpl } = setup(false);
    fetchImpl.mockResolvedValueOnce(json(201, topic));
    await request(ENDPOINTS.createTopic, { body: { name: '' } });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});

describe('success responses', () => {
  it('returns parsed JSON', async () => {
    const { request, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(json(200, [topic]));
    expect(await request(ENDPOINTS.listTopics)).toEqual([topic]);
  });

  it('returns undefined for 204', async () => {
    const { request, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await request(ENDPOINTS.deleteTopic, { params: { topicId: ID } })).toBeUndefined();
  });

  it('throws INVALID_RESPONSE when a 2xx body is not JSON', async () => {
    const { request, fetchImpl } = setup(false);
    fetchImpl.mockResolvedValueOnce(new Response('<html></html>', { status: 200 }));
    const err = await request(ENDPOINTS.listTopics).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ code: 'INVALID_RESPONSE', status: 200 });
  });
});

describe('error responses', () => {
  it('turns an ApiError envelope into ApiClientError', async () => {
    const { request, fetchImpl } = setup();
    const details = [{ path: ['name'], message: 'Already exists', code: 'REFERENCE_NOT_FOUND' }];
    fetchImpl.mockResolvedValueOnce(
      json(409, { error: { code: 'DUPLICATE_TOPIC', message: 'Topic exists', details } }),
    );
    const err = await request(ENDPOINTS.createTopic, { body: { name: 'OS' } }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.name).toBe('ApiClientError');
    expect(err.status).toBe(409);
    expect(err.code).toBe('DUPLICATE_TOPIC');
    expect(err.message).toBe('Topic exists');
    expect(err.details).toEqual(details);
    expect(err.details[0].code).toBe('REFERENCE_NOT_FOUND');
  });

  it('falls back to HTTP_ERROR for a non-JSON body without leaking it', async () => {
    const { request, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(
      new Response('<html>stack trace secret</html>', { status: 502 }),
    );
    const err = await request(ENDPOINTS.listTopics).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ code: 'HTTP_ERROR', status: 502 });
    expect(err.message).not.toContain('secret');
    expect(err.details).toBeUndefined();
  });

  it('falls back to HTTP_ERROR for JSON that is not an ApiError', async () => {
    const { request, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(json(500, { message: 'boom' }));
    const err = await request(ENDPOINTS.listTopics).catch((e) => e);
    expect(err).toMatchObject({ code: 'HTTP_ERROR', status: 500 });
    expect(err.message).not.toContain('boom');
  });

  it('turns a rejected fetch into NETWORK_ERROR with status 0', async () => {
    const { request, fetchImpl } = setup();
    const cause = new TypeError('Failed to fetch');
    fetchImpl.mockRejectedValueOnce(cause);
    const err = await request(ENDPOINTS.listTopics).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    expect(err.cause).toBe(cause);
  });
});

describe('response validation', () => {
  const bad = [{ id: 'not-an-object-id' }];

  it('throws INVALID_RESPONSE and logs issues when validate is true', async () => {
    const { request, fetchImpl } = setup(true);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchImpl.mockResolvedValueOnce(json(200, bad));
    const err = await request(ENDPOINTS.listTopics).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err).toMatchObject({ code: 'INVALID_RESPONSE', status: 200 });
    expect(spy).toHaveBeenCalledOnce();
  });

  it('returns the JSON unchanged when validate is false', async () => {
    const { request, fetchImpl } = setup(false);
    fetchImpl.mockResolvedValueOnce(json(200, bad));
    expect(await request(ENDPOINTS.listTopics)).toEqual(bad);
  });
});
