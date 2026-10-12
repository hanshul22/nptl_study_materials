import { ItemThreadQuery } from '@study/shared';

/** Validates an ItemRef-like value and returns it as a `query` record for `request()`. Throws on invalid input. */
export function buildThreadQuery(item: unknown): Record<string, string | number> {
  // ItemThreadQuery is strict and coerces `number`, so the parsed output is the exact query.
  return ItemThreadQuery.parse(item);
}
