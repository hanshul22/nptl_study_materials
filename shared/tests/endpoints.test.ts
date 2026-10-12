import { describe, expect, it } from 'vitest';
import { ENDPOINTS } from '../src/endpoints.js';
import { ItemThreadQuery } from '../src/schemas/ai.js';

const entries = Object.entries(ENDPOINTS);

describe('ENDPOINTS', () => {
  it('has 24 entries', () => {
    expect(entries).toHaveLength(24);
  });

  it('has unique method + path pairs', () => {
    const keys = entries.map(([, e]) => `${e.method} ${e.path}`);
    expect(new Set(keys).size).toBe(entries.length);
  });

  it('every path is relative to /api/v1 (starts with "/", no base prefix)', () => {
    for (const [name, e] of entries) {
      expect(e.path.startsWith('/'), name).toBe(true);
      expect(e.path.startsWith('/api'), name).toBe(false);
    }
  });

  it('204 endpoints have no response schema; others use a 2xx status', () => {
    for (const [name, e] of entries) {
      expect(e.status >= 200 && e.status < 300, name).toBe(true);
      if (e.status === 204) expect('response' in e, name).toBe(false);
    }
  });

  it('GET and DELETE endpoints have no request body schema', () => {
    for (const [name, e] of entries) {
      if (e.method === 'GET' || e.method === 'DELETE') expect('request' in e, name).toBe(false);
    }
  });

  it('follows the status codes in dtos.md section 11', () => {
    expect(ENDPOINTS.createTopic.status).toBe(201);
    expect(ENDPOINTS.uploadDocument.status).toBe(202);
    expect(ENDPOINTS.createNote.status).toBe(201);
    expect(ENDPOINTS.importMcqSet.status).toBe(201);
    expect(ENDPOINTS.deleteTopic.status).toBe(204);
    expect(ENDPOINTS.deleteDocument.status).toBe(204);
    expect(ENDPOINTS.deleteNote.status).toBe(204);
    expect(ENDPOINTS.deleteMcqSet.status).toBe(204);
  });

  it('only the thread endpoint has a query schema, and it is ItemThreadQuery', () => {
    const withQuery = entries.filter(([, e]) => 'query' in e).map(([name]) => name);
    expect(withQuery).toEqual(['getItemThread']);
    expect(ENDPOINTS.getItemThread.query).toBe(ItemThreadQuery);
  });

  it('request and response schemas parse real payloads', () => {
    expect(ENDPOINTS.health.response.safeParse({ status: 'ok' }).success).toBe(true);
    expect(ENDPOINTS.health.response.safeParse({ status: 'down' }).success).toBe(false);
    expect(ENDPOINTS.createTopic.request.safeParse({ name: 'OS' }).success).toBe(true);
    expect(ENDPOINTS.createTopic.request.safeParse({ name: '' }).success).toBe(false);
    expect(ENDPOINTS.listTopics.response.safeParse([]).success).toBe(true);
    expect(ENDPOINTS.listTopics.response.safeParse({}).success).toBe(false);
  });
});
