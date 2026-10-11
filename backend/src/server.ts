import { ObjectIdStr } from '@study/shared';

// Placeholder proving the @study/shared import resolves. B1.1 replaces this with the real server.
export const isObjectId = (v: unknown): boolean => ObjectIdStr.safeParse(v).success;
