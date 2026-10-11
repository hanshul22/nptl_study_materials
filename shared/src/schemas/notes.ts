import { z } from 'zod';
import { IsoDate, ObjectIdStr } from './primitives.js';

export const QuickNoteCreate = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(50_000).default(''), // markdown
});
export type QuickNoteCreate = z.infer<typeof QuickNoteCreate>;

// No default on content: a title-only PATCH must not reset the stored content to ''.
export const QuickNoteUpdate = QuickNoteCreate.extend({
  content: z.string().max(50_000),
}).partial();
export type QuickNoteUpdate = z.infer<typeof QuickNoteUpdate>;

export const QuickNote = z.object({
  id: ObjectIdStr,
  topicId: ObjectIdStr,
  title: z.string(),
  content: z.string(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type QuickNote = z.infer<typeof QuickNote>;
