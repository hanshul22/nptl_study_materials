import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sendError } from '../utils/sendError.js';

export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}): RequestHandler {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) =>
      sendError(res, 'RATE_LIMITED', 'Too many requests, please try again later'),
  });
}

// ponytail: in-memory counters, per process and shared by every app in it; fine for one
// laptop instance, switch to a shared store if the backend is ever scaled out.
export const generalRateLimiter = createRateLimiter({ limit: 200, windowMs: 60_000 });
