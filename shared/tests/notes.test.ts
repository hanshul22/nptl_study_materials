import { describe, expect, it } from 'vitest';
import { QuickNote, QuickNoteCreate, QuickNoteUpdate } from '../src/schemas/notes.js';
import { bad, DATE, ID, ID2, ok } from './helpers.js';

describe('QuickNoteCreate', () => {
  it('accepts title only and defaults content to empty string', () => {
    expect(QuickNoteCreate.parse({ title: 'Idea' })).toEqual({ title: 'Idea', content: '' });
  });
  it('accepts title and content, and trims the title but not the content', () => {
    const r = QuickNoteCreate.parse({ title: '  Idea ', content: '  # md  ' });
    expect(r).toEqual({ title: 'Idea', content: '  # md  ' });
  });
  it('enforces title length 1..200', () => {
    ok(QuickNoteCreate, { title: 'a'.repeat(200) });
    bad(QuickNoteCreate, { title: 'a'.repeat(201) });
    bad(QuickNoteCreate, { title: '' });
    bad(QuickNoteCreate, { title: '   ' });
  });
  it('enforces content max 50,000', () => {
    ok(QuickNoteCreate, { title: 'x', content: 'a'.repeat(50_000) });
    bad(QuickNoteCreate, { title: 'x', content: 'a'.repeat(50_001) });
  });
  it('rejects missing title and wrong types', () => {
    bad(QuickNoteCreate, {});
    bad(QuickNoteCreate, { content: 'only content' });
    bad(QuickNoteCreate, { title: 1 });
    bad(QuickNoteCreate, { title: 'x', content: 1 });
  });
});

describe('QuickNoteUpdate', () => {
  it('accepts empty and partial bodies', () => {
    ok(QuickNoteUpdate, {});
    ok(QuickNoteUpdate, { title: 'New' });
    ok(QuickNoteUpdate, { content: 'New' });
  });
  it('still validates present fields', () => {
    bad(QuickNoteUpdate, { title: '' });
    bad(QuickNoteUpdate, { content: 'a'.repeat(50_001) });
  });
  // A title-only PATCH must not reset the stored content to ''.
  it('does not inject defaults for absent fields', () => {
    expect(QuickNoteUpdate.parse({ title: 'New' })).toEqual({ title: 'New' });
    expect(QuickNoteUpdate.parse({})).toEqual({});
  });
});

describe('QuickNote', () => {
  const valid = {
    id: ID,
    topicId: ID2,
    title: 'Idea',
    content: '',
    createdAt: DATE,
    updatedAt: DATE,
  };
  it('accepts a valid note', () => ok(QuickNote, valid));
  it('rejects missing fields and bad values', () => {
    bad(QuickNote, { ...valid, content: undefined });
    bad(QuickNote, { ...valid, id: 'x' });
    bad(QuickNote, { ...valid, updatedAt: 'x' });
    bad(QuickNote, { ...valid, title: 5 });
  });
});
