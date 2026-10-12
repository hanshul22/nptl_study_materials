import type { RequestHandler } from 'express';
import { sendError } from '../utils/sendError.js';

export const notFound: RequestHandler = (_req, res) => {
  sendError(res, 'NOT_FOUND', 'Route not found');
};
