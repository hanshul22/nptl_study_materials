import { describe, expect, it } from 'vitest';
import { buildThreadQuery } from './threadQuery';

const ID = '507f1f77bcf86cd799439011';

describe('buildThreadQuery', () => {
  it('accepts an mcq item with a numeric number', () => {
    expect(buildThreadQuery({ type: 'mcq', setId: ID, number: 3 })).toEqual({
      type: 'mcq',
      setId: ID,
      number: 3,
    });
  });

  it('accepts a quickNote item', () => {
    expect(buildThreadQuery({ type: 'quickNote', noteId: ID })).toEqual({
      type: 'quickNote',
      noteId: ID,
    });
  });

  it('rejects a bad ObjectId', () => {
    expect(() => buildThreadQuery({ type: 'quickNote', noteId: 'nope' })).toThrow();
    expect(() => buildThreadQuery({ type: 'mcq', setId: 'zz', number: 1 })).toThrow();
  });

  it('rejects extra and missing fields', () => {
    expect(() => buildThreadQuery({ type: 'mcq', setId: ID, number: 1, noteId: ID })).toThrow();
    expect(() => buildThreadQuery({ type: 'quickNote', noteId: ID, number: 1 })).toThrow();
    expect(() => buildThreadQuery({ type: 'mcq', setId: ID })).toThrow();
    expect(() => buildThreadQuery({ type: 'quickNote' })).toThrow();
    expect(() => buildThreadQuery({ type: 'mcq', setId: ID, number: 0 })).toThrow();
  });
});
