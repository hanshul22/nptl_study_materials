import { describe, expect, it } from 'vitest';
import {
  AskRequest,
  AskResponse,
  AskScope,
  ChatMessage,
  ItemAskRequest,
  ItemAskResponse,
  ItemRef,
  ItemThreadQuery,
  Source,
  ThreadMessage,
  ThreadResponse,
} from '../src/schemas/ai.js';
import { bad, DATE, ID, ID2, ok } from './helpers.js';

const source = { n: 1, documentId: ID, filename: 'OS-Notes.pdf', page: 14, snippet: 'text' };
const msg = (over: Record<string, unknown> = {}) => ({ role: 'user', content: 'hi', ...over });

describe('Source', () => {
  it('accepts a valid source', () => ok(Source, source));
  it('n and page must be integers >= 1', () => {
    bad(Source, { ...source, n: 0 });
    bad(Source, { ...source, page: 0 });
    bad(Source, { ...source, n: 1.5 });
    bad(Source, { ...source, page: '3' });
  });
  it('snippet is at most 300 chars', () => {
    ok(Source, { ...source, snippet: 'a'.repeat(300) });
    bad(Source, { ...source, snippet: 'a'.repeat(301) });
  });
  it('rejects bad documentId and missing fields', () => {
    bad(Source, { ...source, documentId: 'x' });
    bad(Source, { ...source, filename: undefined });
  });
});

describe('ChatMessage', () => {
  it('accepts user and assistant roles', () => {
    ok(ChatMessage, msg());
    ok(ChatMessage, msg({ role: 'assistant' }));
  });
  it('rejects other roles and content over 8000 chars', () => {
    bad(ChatMessage, msg({ role: 'system' }));
    ok(ChatMessage, msg({ content: 'a'.repeat(8000) }));
    bad(ChatMessage, msg({ content: 'a'.repeat(8001) }));
    bad(ChatMessage, { role: 'user' });
  });
});

describe('AskScope', () => {
  it('accepts each variant', () => {
    ok(AskScope, { type: 'topic' });
    ok(AskScope, { type: 'document', documentId: ID });
    ok(AskScope, { type: 'all' });
  });
  it('rejects a document scope without a valid documentId', () => {
    bad(AskScope, { type: 'document' });
    bad(AskScope, { type: 'document', documentId: 'nope' });
  });
  it('rejects unknown or missing type', () => {
    bad(AskScope, { type: 'global' });
    bad(AskScope, {});
    bad(AskScope, 'topic');
  });
});

describe('AskRequest', () => {
  it('defaults scope to { type: "topic" }', () => {
    expect(AskRequest.parse({ question: 'What is a deadlock?' }).scope).toEqual({ type: 'topic' });
  });
  it('keeps an explicit scope', () => {
    const r = AskRequest.parse({ question: 'q', scope: { type: 'document', documentId: ID } });
    expect(r.scope).toEqual({ type: 'document', documentId: ID });
    expect(AskRequest.parse({ question: 'q', scope: { type: 'all' } }).scope).toEqual({
      type: 'all',
    });
  });
  it('trims question and enforces 1..2000', () => {
    expect(AskRequest.parse({ question: '  q  ' }).question).toBe('q');
    ok(AskRequest, { question: 'a'.repeat(2000) });
    bad(AskRequest, { question: 'a'.repeat(2001) });
    bad(AskRequest, { question: '' });
    bad(AskRequest, { question: '   ' });
    bad(AskRequest, {});
  });
  it('history is optional and capped at 6 messages', () => {
    const history = (n: number) => Array.from({ length: n }, () => msg());
    ok(AskRequest, { question: 'q' });
    ok(AskRequest, { question: 'q', history: [] });
    ok(AskRequest, { question: 'q', history: history(6) });
    bad(AskRequest, { question: 'q', history: history(7) });
  });
  it('rejects invalid history items and invalid scope', () => {
    bad(AskRequest, { question: 'q', history: [msg({ role: 'bot' })] });
    bad(AskRequest, { question: 'q', scope: { type: 'document' } });
  });
});

describe('AskResponse', () => {
  const valid = { answer: 'Yes [1]', sources: [source], grounded: true, model: 'm' };
  it('accepts grounded and ungrounded answers', () => {
    ok(AskResponse, valid);
    ok(AskResponse, { ...valid, sources: [], grounded: false });
  });
  it('rejects bad types', () => {
    bad(AskResponse, { ...valid, grounded: 'yes' });
    bad(AskResponse, { ...valid, sources: [{ n: 0 }] });
    bad(AskResponse, { ...valid, model: undefined });
  });
});

describe('ItemRef', () => {
  it('accepts an mcq ref and a quickNote ref', () => {
    ok(ItemRef, { type: 'mcq', setId: ID, number: 3 });
    ok(ItemRef, { type: 'quickNote', noteId: ID });
  });
  it('rejects an mcq ref with missing or invalid fields', () => {
    bad(ItemRef, { type: 'mcq', setId: ID });
    bad(ItemRef, { type: 'mcq', number: 3 });
    bad(ItemRef, { type: 'mcq', setId: ID, number: 0 });
    bad(ItemRef, { type: 'mcq', setId: ID, number: 1.5 });
    bad(ItemRef, { type: 'mcq', setId: 'x', number: 1 });
  });
  it('rejects a quickNote ref with missing or invalid noteId', () => {
    bad(ItemRef, { type: 'quickNote' });
    bad(ItemRef, { type: 'quickNote', noteId: 'x' });
    bad(ItemRef, { type: 'quickNote', setId: ID }); // wrong variant's field
  });
  it('rejects unknown type', () => {
    bad(ItemRef, { type: 'document', noteId: ID });
    bad(ItemRef, {});
  });
});

describe('ItemAskRequest', () => {
  const item = { type: 'mcq', setId: ID, number: 1 };
  it('accepts both item variants', () => {
    ok(ItemAskRequest, { item, doubt: 'Why C?' });
    ok(ItemAskRequest, { item: { type: 'quickNote', noteId: ID }, doubt: 'Explain' });
  });
  it('trims doubt and enforces 1..1000', () => {
    expect(ItemAskRequest.parse({ item, doubt: '  why ' }).doubt).toBe('why');
    ok(ItemAskRequest, { item, doubt: 'a'.repeat(1000) });
    bad(ItemAskRequest, { item, doubt: 'a'.repeat(1001) });
    bad(ItemAskRequest, { item, doubt: '' });
    bad(ItemAskRequest, { item, doubt: '   ' });
  });
  it('rejects missing or invalid item', () => {
    bad(ItemAskRequest, { doubt: 'x' });
    bad(ItemAskRequest, { item: { type: 'mcq' }, doubt: 'x' });
    bad(ItemAskRequest, { item });
  });
});

describe('ThreadMessage, ItemAskResponse, ThreadResponse', () => {
  const user = { id: ID, role: 'user', content: 'why?', sources: [], createdAt: DATE };
  const assistant = { ...user, id: ID2, role: 'assistant', sources: [source] };

  it('ThreadMessage accepts user and assistant messages', () => {
    ok(ThreadMessage, user);
    ok(ThreadMessage, assistant);
  });
  it('ThreadMessage rejects bad role, missing sources, bad date', () => {
    bad(ThreadMessage, { ...user, role: 'system' });
    bad(ThreadMessage, { ...user, sources: undefined });
    bad(ThreadMessage, { ...user, createdAt: 'x' });
  });
  it('ItemAskResponse accepts a valid response and rejects a missing message', () => {
    const valid = {
      threadId: ID,
      userMessage: user,
      assistantMessage: assistant,
      grounded: true,
    };
    ok(ItemAskResponse, valid);
    bad(ItemAskResponse, { ...valid, assistantMessage: undefined });
    bad(ItemAskResponse, { ...valid, threadId: null });
  });
  it('ThreadResponse accepts an existing thread and the empty { threadId: null } form', () => {
    ok(ThreadResponse, { threadId: ID, messages: [user, assistant] });
    ok(ThreadResponse, { threadId: null, messages: [] });
  });
  it('ThreadResponse rejects a missing threadId or bad messages', () => {
    bad(ThreadResponse, { messages: [] });
    bad(ThreadResponse, { threadId: ID, messages: [{ role: 'user' }] });
  });
});

describe('ItemThreadQuery', () => {
  it('accepts an mcq query and coerces number from a string', () => {
    expect(ItemThreadQuery.parse({ type: 'mcq', setId: ID, number: '3' })).toEqual({
      type: 'mcq',
      setId: ID,
      number: 3,
    });
    ok(ItemThreadQuery, { type: 'mcq', setId: ID, number: 3 });
  });
  it('accepts a quickNote query', () => {
    ok(ItemThreadQuery, { type: 'quickNote', noteId: ID });
  });
  it('rejects an mcq query without setId or number, or with a bad number', () => {
    bad(ItemThreadQuery, { type: 'mcq', number: '3' });
    bad(ItemThreadQuery, { type: 'mcq', setId: ID });
    bad(ItemThreadQuery, { type: 'mcq', setId: ID, number: '0' });
    bad(ItemThreadQuery, { type: 'mcq', setId: ID, number: 'abc' });
    bad(ItemThreadQuery, { type: 'mcq', setId: ID, number: '' });
    bad(ItemThreadQuery, { type: 'mcq', setId: ID, number: '1.5' });
  });
  it('rejects a quickNote query without noteId', () => {
    bad(ItemThreadQuery, { type: 'quickNote' });
  });
  it("rejects the other variant's key (strict)", () => {
    bad(ItemThreadQuery, { type: 'mcq', setId: ID, number: '1', noteId: ID });
    bad(ItemThreadQuery, { type: 'mcq', noteId: ID });
    bad(ItemThreadQuery, { type: 'quickNote', noteId: ID, setId: ID });
    bad(ItemThreadQuery, { type: 'quickNote', setId: ID });
  });
  it('rejects unknown type, extra keys, and malformed ObjectIds', () => {
    bad(ItemThreadQuery, { type: 'document', noteId: ID });
    bad(ItemThreadQuery, {});
    bad(ItemThreadQuery, { type: 'quickNote', noteId: ID, extra: 'x' });
    bad(ItemThreadQuery, { type: 'mcq', setId: ID, number: '1', extra: 'x' });
    bad(ItemThreadQuery, { type: 'mcq', setId: 'nope', number: '1' });
    bad(ItemThreadQuery, { type: 'quickNote', noteId: 'nope' });
  });
});
