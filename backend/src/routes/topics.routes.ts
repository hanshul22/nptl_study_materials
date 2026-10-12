import { Router } from 'express';
import { ENDPOINTS, TopicCreate, TopicUpdate } from '@study/shared';
import {
  TopicIdParams,
  createTopic,
  deleteTopic,
  listTopics,
  updateTopic,
} from '../controllers/topics.controller.js';
import { validate } from '../middleware/validate.js';

// Paths are relative to /api/v1 (mounted in createApp).
export const topicsRouter = Router();

topicsRouter.get(ENDPOINTS.listTopics.path, listTopics);
topicsRouter.post(ENDPOINTS.createTopic.path, validate({ body: TopicCreate }), createTopic);
topicsRouter.patch(
  ENDPOINTS.updateTopic.path,
  validate({ body: TopicUpdate, params: TopicIdParams }),
  updateTopic,
);
topicsRouter.delete(ENDPOINTS.deleteTopic.path, validate({ params: TopicIdParams }), deleteTopic);
