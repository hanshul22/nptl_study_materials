import { z } from 'zod';
import { IsoDate, ObjectIdStr } from './primitives.js';

export const TopicCreate = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
});
export type TopicCreate = z.infer<typeof TopicCreate>;

export const TopicUpdate = TopicCreate.partial();
export type TopicUpdate = z.infer<typeof TopicUpdate>;

export const Topic = z.object({
  id: ObjectIdStr,
  name: z.string(),
  description: z.string().nullable(),
  documentCount: z.number().int(),
  noteCount: z.number().int(),
  mcqSetCount: z.number().int(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Topic = z.infer<typeof Topic>;
