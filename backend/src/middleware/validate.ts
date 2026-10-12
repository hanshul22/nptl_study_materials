import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { sendError, type ErrorDetails } from '../utils/sendError.js';

interface Schemas {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}

/**
 * Shape of `res.locals` after `validate`. Callers cast once, e.g.
 * `res.locals as ValidatedLocals<z.output<typeof MyQuery>, z.output<typeof MyParams>>`.
 */
export interface ValidatedLocals<Q = unknown, P = unknown> {
  query: Q;
  params: P;
}

/**
 * Validates body, query and params with schemas from @study/shared (safeParse).
 * Success: req.body is replaced by the parsed body; parsed query and params go to
 * res.locals.query / res.locals.params (Express 5 makes req.query read-only).
 * Failure: 400 VALIDATION_ERROR with issues from all three parts aggregated.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    const details: ErrorDetails = [];
    const parts = [
      ['body', schemas.body, req.body],
      ['query', schemas.query, req.query],
      ['params', schemas.params, req.params],
    ] as const;
    const parsed: Partial<Record<'body' | 'query' | 'params', unknown>> = {};

    for (const [name, schema, input] of parts) {
      if (!schema) continue;
      const result = schema.safeParse(input);
      if (result.success) {
        parsed[name] = result.data;
        continue;
      }
      for (const issue of result.error.issues) {
        const code = issue.code === 'custom' ? issue.params?.code : undefined;
        details.push({
          path: issue.path.map((p) => (typeof p === 'number' ? p : String(p))),
          message: issue.message,
          ...(typeof code === 'string' && { code }),
        });
      }
    }

    if (details.length > 0) {
      sendError(res, 'VALIDATION_ERROR', 'Request validation failed', details);
      return;
    }
    if (schemas.body) req.body = parsed.body;
    if (schemas.query) res.locals.query = parsed.query;
    if (schemas.params) res.locals.params = parsed.params;
    next();
  };
}
