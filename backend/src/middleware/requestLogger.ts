import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';

/**
 * One line per request: method, path (no query string), status, responseTime.
 * The serializers keep only those fields, so no headers, query values or bodies are logged.
 */
export function requestLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    serializers: {
      req: (req: { method?: string; originalUrl?: string; url?: string }) => ({
        method: req.method,
        path: (req.originalUrl ?? req.url ?? '').split('?')[0],
      }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
  });
}
