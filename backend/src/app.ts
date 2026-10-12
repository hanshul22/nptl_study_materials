import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { Config } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { owner } from './middleware/owner.js';
import { generalRateLimiter } from './middleware/rateLimit.js';
import { requestLogger } from './middleware/requestLogger.js';
import { createLogger } from './utils/logger.js';

export function createApp(config: Config, options: { logger?: Logger } = {}): Express {
  const app = express();
  app.locals.config = config;

  app.use(requestLogger(options.logger ?? createLogger()));
  app.use(helmet());
  app.use(
    cors({
      // A one-item list (not a bare string) so other origins get no CORS headers at all.
      origin: [config.FRONTEND_ORIGIN],
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      exposedHeaders: ['Content-Disposition'],
    }),
  );
  app.use(generalRateLimiter);
  app.use(express.json({ limit: '2mb' }));
  app.use(owner);

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
