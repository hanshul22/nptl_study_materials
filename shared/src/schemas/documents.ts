import { z } from 'zod';
import { IsoDate, ObjectIdStr } from './primitives.js';

export const DocumentStatus = z.enum(['processing', 'ready', 'failed']);
export type DocumentStatus = z.infer<typeof DocumentStatus>;

export const DocumentDto = z.object({
  id: ObjectIdStr,
  topicId: ObjectIdStr,
  filename: z.string(), // original filename, display only
  sizeBytes: z.number().int(),
  pageCount: z.number().int().nullable(), // null until extraction finishes
  chunkCount: z.number().int(),
  status: DocumentStatus,
  errorCode: z.string().nullable(), // set when status = 'failed'
  errorMessage: z.string().nullable(),
  createdAt: IsoDate,
});
export type DocumentDto = z.infer<typeof DocumentDto>;
