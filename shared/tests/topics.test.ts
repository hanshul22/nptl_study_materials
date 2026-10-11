import { describe, expect, it } from 'vitest';
import { Topic, TopicCreate, TopicUpdate } from '../src/schemas/topics.js';
import { bad, DATE, ID, ok } from './helpers.js';

describe('TopicCreate', () => {
  it('accepts name only, and name with description', () => {
    ok(TopicCreate, { name: 'Operating Systems' });
    ok(TopicCreate, { name: 'OS', description: 'Semester 5' });
  });
  it('trims name and description', () => {
    const r = TopicCreate.parse({ name: '  OS  ', description: '  notes ' });
    expect(r).toEqual({ name: 'OS', description: 'notes' });
  });
  it('enforces name length 1..100 after trim', () => {
    ok(TopicCreate, { name: 'a'.repeat(100) });
    bad(TopicCreate, { name: 'a'.repeat(101) });
    bad(TopicCreate, { name: '' });
    bad(TopicCreate, { name: '   ' });
  });
  it('enforces description max 500', () => {
    ok(TopicCreate, { name: 'x', description: 'a'.repeat(500) });
    bad(TopicCreate, { name: 'x', description: 'a'.repeat(501) });
  });
  it('rejects missing name and wrong types', () => {
    bad(TopicCreate, {});
    bad(TopicCreate, { description: 'x' });
    bad(TopicCreate, { name: 5 });
    bad(TopicCreate, { name: 'x', description: 5 });
    bad(TopicCreate, null);
  });
});

describe('TopicUpdate', () => {
  it('is partial: empty object and single fields are valid', () => {
    ok(TopicUpdate, {});
    ok(TopicUpdate, { name: 'New' });
    ok(TopicUpdate, { description: 'New' });
  });
  it('does not inject defaults for absent fields', () => {
    expect(TopicUpdate.parse({})).toEqual({});
    expect(TopicUpdate.parse({ name: 'New' })).toEqual({ name: 'New' });
  });
  it('still validates present fields', () => {
    bad(TopicUpdate, { name: '' });
    bad(TopicUpdate, { name: 'a'.repeat(101) });
    bad(TopicUpdate, { description: 'a'.repeat(501) });
  });
});

describe('Topic', () => {
  const valid = {
    id: ID,
    name: 'OS',
    description: null,
    documentCount: 0,
    noteCount: 2,
    mcqSetCount: 1,
    createdAt: DATE,
    updatedAt: DATE,
  };
  it('accepts a valid topic, with description null or string', () => {
    ok(Topic, valid);
    ok(Topic, { ...valid, description: 'text' });
  });
  it('requires description to be present (null, never omitted)', () => {
    const { description: _omit, ...rest } = valid;
    void _omit;
    bad(Topic, rest);
  });
  it('rejects bad id, non-integer counts, and bad dates', () => {
    bad(Topic, { ...valid, id: 'abc' });
    bad(Topic, { ...valid, documentCount: 1.5 });
    bad(Topic, { ...valid, noteCount: '2' });
    bad(Topic, { ...valid, createdAt: '2026-10-11' });
  });
});
