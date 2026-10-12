import { ObjectIdStr, type EndpointDef } from '@study/shared';
import { env } from '../../lib/env';
import { validationErrorResponse } from '../errors';

/** Full URL for an endpoint. msw uses the same `:param` syntax as ENDPOINTS paths. */
export const mockUrl = (endpoint: Pick<EndpointDef, 'path'>): string => env.apiUrl + endpoint.path;

export const newObjectId = (): string =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(12)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

/** Validates an ObjectId path param. Returns the id, or a 400 Response. */
export function parseIdParam(name: string, value: unknown): string | Response {
  const parsed = ObjectIdStr.safeParse(value);
  return parsed.success
    ? parsed.data
    : validationErrorResponse(parsed.error.issues.map((i) => ({ ...i, path: [name] })));
}

/** Request JSON body, or `undefined` when missing or malformed (schemas then reject it). */
export const readJson = (request: Request): Promise<unknown> =>
  request.json().catch(() => undefined);
