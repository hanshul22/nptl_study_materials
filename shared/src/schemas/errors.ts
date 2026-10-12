import { z } from 'zod';

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .array(
        z.object({
          path: z.array(z.union([z.string(), z.number()])),
          message: z.string(),
          code: z.string().optional(), // e.g. 'REFERENCE_NOT_FOUND'
        }),
      )
      .optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// Error code table from dtos.md section 9.
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'DUPLICATE_DOCUMENT',
  'DUPLICATE_TOPIC',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
  'PDF_ENCRYPTED',
  'PDF_NO_TEXT',
  'PDF_TOO_MANY_PAGES',
  'MCQ_IMPORT_INVALID',
  'AI_NOT_CONFIGURED',
  'AI_RATE_LIMITED',
  'AI_UNAVAILABLE',
  'RATE_LIMITED',
  'EXPORT_FAILED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

// HTTP status per code; the compiler enforces that every code is listed.
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  DUPLICATE_DOCUMENT: 409,
  DUPLICATE_TOPIC: 409,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_FILE_TYPE: 415,
  PDF_ENCRYPTED: 422,
  PDF_NO_TEXT: 422,
  PDF_TOO_MANY_PAGES: 422,
  MCQ_IMPORT_INVALID: 422,
  AI_NOT_CONFIGURED: 503,
  AI_RATE_LIMITED: 429,
  AI_UNAVAILABLE: 502,
  RATE_LIMITED: 429,
  EXPORT_FAILED: 500,
  INTERNAL: 500,
};
