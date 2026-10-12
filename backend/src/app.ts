import express, { type Express } from 'express';
import type { Config } from './config/env.js';

export function createApp(config: Config): Express {
  const app = express();
  app.locals.config = config;

  // Temporary smoke-check route (B1.1); /health arrives in B1.2.
  app.get('/api/v1/ping', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
