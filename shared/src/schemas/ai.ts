import { z } from 'zod';
import { IsoDate, ObjectIdStr } from './primitives.js';

export const Source = z.object({
  n: z.number().int().min(1), // the [n] marker used in the answer text
  documentId: ObjectIdStr,
  filename: z.string(),
  page: z.number().int().min(1),
  snippet: z.string().max(300),
});
export type Source = z.infer<typeof Source>;

export const ChatMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(8000),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

// Topic / document / global Q&A (stateless)

export const AskScope = z.discriminatedUnion('type', [
  z.object({ type: z.literal('topic') }), // uses the topic in the URL
  z.object({ type: z.literal('document'), documentId: ObjectIdStr }),
  z.object({ type: z.literal('all') }), // every topic
]);
export type AskScope = z.infer<typeof AskScope>;

export const AskRequest = z.object({
  question: z.string().trim().min(1).max(2000),
  scope: AskScope.default({ type: 'topic' }),
  history: z.array(ChatMessage).max(6).optional(), // sent by the client; the server stores nothing
});
export type AskRequest = z.infer<typeof AskRequest>;

export const AskResponse = z.object({
  answer: z.string(), // markdown, contains [n] citation markers
  sources: z.array(Source), // only sources actually cited in `answer`
  grounded: z.boolean(), // true if at least one source was cited
  model: z.string(),
});
export type AskResponse = z.infer<typeof AskResponse>;

// Per-item "Ask AI" (MCQ or quick note)

export const ItemRef = z.discriminatedUnion('type', [
  z.object({ type: z.literal('mcq'), setId: ObjectIdStr, number: z.number().int().min(1) }),
  z.object({ type: z.literal('quickNote'), noteId: ObjectIdStr }),
]);
export type ItemRef = z.infer<typeof ItemRef>;

export const ItemAskRequest = z.object({
  item: ItemRef,
  doubt: z.string().trim().min(1).max(1000), // what the user did not understand
});
export type ItemAskRequest = z.infer<typeof ItemAskRequest>;

export const ThreadMessage = z.object({
  id: ObjectIdStr,
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sources: z.array(Source), // empty for user messages
  createdAt: IsoDate,
});
export type ThreadMessage = z.infer<typeof ThreadMessage>;

export const ItemAskResponse = z.object({
  threadId: ObjectIdStr,
  userMessage: ThreadMessage,
  assistantMessage: ThreadMessage,
  grounded: z.boolean(),
});
export type ItemAskResponse = z.infer<typeof ItemAskResponse>;

export const ThreadResponse = z.object({
  threadId: ObjectIdStr.nullable(), // null when no thread exists yet
  messages: z.array(ThreadMessage),
});
export type ThreadResponse = z.infer<typeof ThreadResponse>;

// Query string of GET /topics/:topicId/items/thread. Query values arrive as strings, so
// `number` is coerced. Strict objects reject keys that belong to the other variant.
export const ItemThreadQuery = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('mcq'),
    setId: ObjectIdStr,
    number: z.coerce.number().int().min(1),
  }),
  z.strictObject({ type: z.literal('quickNote'), noteId: ObjectIdStr }),
]);
export type ItemThreadQuery = z.infer<typeof ItemThreadQuery>;
