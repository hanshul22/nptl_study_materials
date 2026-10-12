// @vitest-environment node
import { ENDPOINTS, Settings, Topic } from '@study/shared';
import { describe, expect, it } from 'vitest';
import { ApiClientError, createApiClient } from '../../api';
import { env } from '../../lib/env';
import { topicFixtures } from '../fixtures/topics';
import { setupMockServer } from '../setupMockServer';

setupMockServer();

// Real client -> msw. fetchImpl is left unset so it resolves globalThis.fetch per call (patched by msw).
// `strict` validates requests and responses; `lax` lets us send deliberately invalid input.
const strict = createApiClient({ baseUrl: env.apiUrl, validate: true });
const lax = createApiClient({ baseUrl: env.apiUrl, validate: false });

const [first] = topicFixtures();
const FIRST_ID = first!.id;
const MISSING_ID = '65a1f0c2e4b0a1b2c3d4e5ff';

const fail = async (p: Promise<unknown>) => {
  const err = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiClientError);
  return err as ApiClientError;
};

describe('topics', () => {
  it('lists topics', async () => {
    const topics = await strict(ENDPOINTS.listTopics);
    expect(topics.map((t) => t.name)).toEqual(topicFixtures().map((t) => t.name));
    topics.forEach((t) => Topic.parse(t));
  });

  it('creates a topic (201) with a new id and zero counts', async () => {
    const created = Topic.parse(
      await strict(ENDPOINTS.createTopic, { body: { name: '  Algorithms  ' } }),
    );
    expect(created).toMatchObject({
      name: 'Algorithms',
      description: null,
      documentCount: 0,
      noteCount: 0,
      mcqSetCount: 0,
    });
    expect(topicFixtures().some((t) => t.id === created.id)).toBe(false);
    expect(created.createdAt).toBe(created.updatedAt);
    expect(await strict(ENDPOINTS.listTopics)).toHaveLength(4);
  });

  it('rejects a duplicate name with a different case (409)', async () => {
    const err = await fail(lax(ENDPOINTS.createTopic, { body: { name: 'operating SYSTEMS' } }));
    expect(err).toMatchObject({ status: 409, code: 'DUPLICATE_TOPIC' });
  });

  it('rejects an empty name (400) with details paths', async () => {
    const err = await fail(lax(ENDPOINTS.createTopic, { body: { name: '   ' } }));
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(err.details?.map((d) => d.path)).toContainEqual(['name']);
  });

  it('renames a topic and bumps updatedAt', async () => {
    const updated = Topic.parse(
      await strict(ENDPOINTS.updateTopic, {
        params: { topicId: FIRST_ID },
        body: { name: 'OS' },
      }),
    );
    expect(updated.name).toBe('OS');
    expect(updated.updatedAt).not.toBe(first!.updatedAt);
    expect(updated.createdAt).toBe(first!.createdAt);
  });

  it("clears the description with '' (D-025)", async () => {
    const updated = Topic.parse(
      await strict(ENDPOINTS.updateTopic, {
        params: { topicId: FIRST_ID },
        body: { description: '' },
      }),
    );
    expect(updated.description).toBeNull();
  });

  it('rejects renaming to another topic name (409)', async () => {
    const err = await fail(
      lax(ENDPOINTS.updateTopic, {
        params: { topicId: FIRST_ID },
        body: { name: 'database systems' },
      }),
    );
    expect(err).toMatchObject({ status: 409, code: 'DUPLICATE_TOPIC' });
  });

  it('returns 404 for an unknown id on patch', async () => {
    const err = await fail(
      lax(ENDPOINTS.updateTopic, { params: { topicId: MISSING_ID }, body: { name: 'X' } }),
    );
    expect(err).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('returns 400 for an invalid id on patch', async () => {
    const err = await fail(
      lax(ENDPOINTS.updateTopic, { params: { topicId: 'nope' }, body: { name: 'X' } }),
    );
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(err.details?.[0]?.path).toEqual(['topicId']);
  });

  it('deletes a topic (204) and it leaves the list', async () => {
    expect(await strict(ENDPOINTS.deleteTopic, { params: { topicId: FIRST_ID } })).toBeUndefined();
    const topics = await strict(ENDPOINTS.listTopics);
    expect(topics.some((t) => t.id === FIRST_ID)).toBe(false);
    expect(topics).toHaveLength(2);
  });

  it('returns 404 for an unknown id on delete', async () => {
    const err = await fail(lax(ENDPOINTS.deleteTopic, { params: { topicId: MISSING_ID } }));
    expect(err).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('starts from the seed data in every test (reset works)', async () => {
    expect(await strict(ENDPOINTS.listTopics)).toHaveLength(3);
  });
});

describe('settings', () => {
  it('gets settings', async () => {
    const settings = Settings.parse(await strict(ENDPOINTS.getSettings));
    expect(settings).toMatchObject({ model: 'openrouter/auto', maxChunks: 6, aiConfigured: false });
  });

  it('patch merges and leaves aiConfigured unchanged', async () => {
    const updated = Settings.parse(
      await lax(ENDPOINTS.updateSettings, { body: { maxChunks: 8, aiConfigured: true } }),
    );
    expect(updated).toEqual({
      model: 'openrouter/auto',
      maxChunks: 8,
      maxTokens: 1200,
      temperature: 0.2,
      aiConfigured: false,
    });
    expect(await strict(ENDPOINTS.getSettings)).toEqual(updated);
  });

  it('rejects an invalid patch (maxChunks 99) with 400', async () => {
    const err = await fail(lax(ENDPOINTS.updateSettings, { body: { maxChunks: 99 } }));
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(err.details?.[0]?.path).toEqual(['maxChunks']);
  });
});
