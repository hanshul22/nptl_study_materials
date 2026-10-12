import express, { type Express } from 'express';
import type { Config } from './config/env.js';

export function createApp(config: Config): Express {
  const app = express();
  app.locals.config = config;

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
