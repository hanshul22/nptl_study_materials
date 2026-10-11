import { expect } from 'vitest';
import type { z } from 'zod';

export const ID = '507f1f77bcf86cd799439011';
export const ID2 = '507f1f77bcf86cd799439012';
export const DATE = '2026-10-11T10:00:00.000Z';

export const ok = (schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value);
  expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
};

export const bad = (schema: z.ZodType, value: unknown) => {
  expect(schema.safeParse(value).success).toBe(false);
};

/** Paths of every issue, e.g. [['questions', 1, 'number']]. */
export const issuePaths = (schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => i.path);
};

export const issueMessages = (schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};
