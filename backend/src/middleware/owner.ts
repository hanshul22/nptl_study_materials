import type { RequestHandler } from 'express';

// v1 has no auth; when it arrives, only this middleware changes (trd.md section 4.2).
export const owner: RequestHandler = (req, _res, next) => {
  req.ownerId = 'local';
  next();
};
