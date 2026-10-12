import type { ErrorRequestHandler } from 'express';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/sendError.js';

/** body-parser errors are http-errors with a numeric `status` and a string `type`. */
function bodyParserError(err: unknown): { status: number; type: string } | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const { status, type } = err as { status?: unknown; type?: unknown };
  if (typeof type !== 'string' || typeof status !== 'number') return undefined;
  return { status, type };
}

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.code, err.message, err.details);
    return;
  }

  // Fixed messages only: the parser's own message is never echoed.
  const parser = bodyParserError(err);
  if (parser?.type === 'entity.parse.failed') {
    sendError(res, 'VALIDATION_ERROR', 'Request body is not valid JSON');
    return;
  }
  if (parser?.type === 'entity.too.large') {
    sendError(res, 'FILE_TOO_LARGE', 'Request body is too large (max 2 MB)');
    return;
  }
  if (parser && parser.status >= 400 && parser.status < 500) {
    sendError(res, 'VALIDATION_ERROR', 'Request body could not be read');
    return;
  }

  req.log.error({ err }, 'Unhandled error'); // stack stays in the logs
  sendError(res, 'INTERNAL', 'Something went wrong');
};
