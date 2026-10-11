import { ObjectIdStr } from '@study/shared';

// Placeholder proving the @study/shared import resolves. F1.1 replaces this with the React entry.
export const isObjectId = (v: unknown): boolean => ObjectIdStr.safeParse(v).success;
