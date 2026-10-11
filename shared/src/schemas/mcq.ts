import { z } from 'zod';
import { IsoDate, ObjectIdStr, OptionLetter } from './primitives.js';

export const McqReference = z.object({
  filename: z.string().min(1), // must match an uploaded notes PDF in the topic
  page: z.number().int().min(1).optional(),
});
export type McqReference = z.infer<typeof McqReference>;

export const McqQuestion = z
  .object({
    number: z.number().int().min(1),
    question: z.string().trim().min(1).max(2000),
    options: z
      .record(OptionLetter, z.string().trim().min(1).max(1000))
      .refine((o) => Object.keys(o).length >= 2 && Object.keys(o).length <= 6, {
        message: 'A question needs between 2 and 6 options',
      }),
    answer: OptionLetter.nullable().default(null),
    explanation: z.string().trim().max(4000).nullable().default(null),
    reference: McqReference.optional(),
  })
  .superRefine((q, ctx) => {
    if (q.answer !== null && !(q.answer in q.options)) {
      ctx.addIssue({
        code: 'custom',
        path: ['answer'],
        message: 'answer must be one of the option letters',
      });
    }
  });
export type McqQuestion = z.infer<typeof McqQuestion>;

export const McqSet = z.object({
  id: ObjectIdStr,
  topicId: ObjectIdStr,
  title: z.string(),
  questionCount: z.number().int(),
  questions: z.array(McqQuestion),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type McqSet = z.infer<typeof McqSet>;

export const McqSetSummary = McqSet.omit({ questions: true });
export type McqSetSummary = z.infer<typeof McqSetSummary>;

// The JSON file the user supplies.
export const McqImportRequest = z
  .object({
    topic: z.string().optional(), // informational only, ignored by the server
    title: z.string().trim().min(1).max(200),
    questions: z.array(McqQuestion).min(1).max(500),
  })
  .superRefine((d, ctx) => {
    const seen = new Set<number>();
    d.questions.forEach((q, i) => {
      if (seen.has(q.number)) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', i, 'number'],
          message: `Duplicate question number ${q.number}`,
        });
      }
      seen.add(q.number);
    });
  });
export type McqImportRequest = z.infer<typeof McqImportRequest>;

export const McqImportResponse = z.object({
  setId: ObjectIdStr,
  title: z.string(),
  questionCount: z.number().int(),
  replaced: z.boolean(), // true when an existing set with the same title was overwritten
});
export type McqImportResponse = z.infer<typeof McqImportResponse>;

export const McqExportRequest = z.object({
  // none   = questions only
  // marked = correct option marked inline
  // key    = answer key page at the end
  includeAnswers: z.enum(['none', 'marked', 'key']).default('key'),
  includeExplanations: z.boolean().default(false),
  pageSize: z.enum(['A4', 'Letter']).default('A4'),
  questionNumbers: z.array(z.number().int().min(1)).max(500).optional(), // subset; default all
});
export type McqExportRequest = z.infer<typeof McqExportRequest>;
