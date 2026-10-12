import { ENDPOINTS, TopicCreate, TopicUpdate, type Topic } from '@study/shared';
import { http, HttpResponse } from 'msw';
import { topicFixtures } from '../fixtures/topics';
import { apiErrorResponse, validationErrorResponse } from '../errors';
import { mockUrl, newObjectId, parseIdParam, readJson } from './util';

let topics: Topic[] = topicFixtures();

/** Restores the seed data. Call in `afterEach` of tests. */
export const resetTopics = (): void => {
  topics = topicFixtures();
};

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const duplicate = () =>
  apiErrorResponse('DUPLICATE_TOPIC', 'A topic with this name already exists');
const notFound = () => apiErrorResponse('NOT_FOUND', 'Topic not found');

export const topicHandlers = [
  http.get(mockUrl(ENDPOINTS.listTopics), () =>
    HttpResponse.json(topics, { status: ENDPOINTS.listTopics.status }),
  ),

  http.post(mockUrl(ENDPOINTS.createTopic), async ({ request }) => {
    const parsed = TopicCreate.safeParse(await readJson(request));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const { name, description } = parsed.data;
    if (topics.some((t) => sameName(t.name, name))) return duplicate();

    const now = new Date().toISOString();
    const topic: Topic = {
      id: newObjectId(),
      name,
      description: description || null,
      documentCount: 0,
      noteCount: 0,
      mcqSetCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    topics.push(topic);
    return HttpResponse.json(topic, { status: ENDPOINTS.createTopic.status });
  }),

  http.patch(mockUrl(ENDPOINTS.updateTopic), async ({ request, params }) => {
    const id = parseIdParam('topicId', params.topicId);
    if (id instanceof Response) return id;
    const parsed = TopicUpdate.safeParse(await readJson(request));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const topic = topics.find((t) => t.id === id);
    if (!topic) return notFound();
    const { name, description } = parsed.data;
    if (name !== undefined && topics.some((t) => t.id !== id && sameName(t.name, name))) {
      return duplicate();
    }

    if (name !== undefined) topic.name = name;
    if (description !== undefined) topic.description = description || null; // '' clears (D-025)
    topic.updatedAt = new Date().toISOString();
    return HttpResponse.json(topic, { status: ENDPOINTS.updateTopic.status });
  }),

  http.delete(mockUrl(ENDPOINTS.deleteTopic), ({ params }) => {
    const id = parseIdParam('topicId', params.topicId);
    if (id instanceof Response) return id;
    if (!topics.some((t) => t.id === id)) return notFound();
    topics = topics.filter((t) => t.id !== id);
    return new HttpResponse(null, { status: ENDPOINTS.deleteTopic.status });
  }),
];
