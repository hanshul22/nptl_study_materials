import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ENDPOINTS, ObjectIdStr, type TopicCreate, type TopicUpdate } from '@study/shared';
import type { ValidatedLocals } from '../middleware/validate.js';
import { topicsService } from '../services/topics.service.js';

/** Schema for `:topicId` (D-026b); `validate({ params })` puts the parsed value on res.locals. */
export const TopicIdParams = z.object({ topicId: ObjectIdStr });

const topicId = (res: Parameters<RequestHandler>[1]) =>
  (res.locals as ValidatedLocals<unknown, z.output<typeof TopicIdParams>>).params.topicId;

export const listTopics: RequestHandler = async (req, res) => {
  res.status(ENDPOINTS.listTopics.status).json(await topicsService.list(req.ownerId));
};

export const createTopic: RequestHandler = async (req, res) => {
  const topic = await topicsService.create(req.ownerId, req.body as TopicCreate);
  res.status(ENDPOINTS.createTopic.status).json(topic);
};

export const updateTopic: RequestHandler = async (req, res) => {
  const topic = await topicsService.update(req.ownerId, topicId(res), req.body as TopicUpdate);
  res.status(ENDPOINTS.updateTopic.status).json(topic);
};

export const deleteTopic: RequestHandler = async (req, res) => {
  await topicsService.remove(req.ownerId, topicId(res));
  res.status(ENDPOINTS.deleteTopic.status).end();
};
