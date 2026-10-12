import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { McqImportRequest } from '../src/schemas/mcq.js';

const dir = fileURLToPath(new URL('../fixtures/mcq/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const load = (f: string): unknown => JSON.parse(readFileSync(dir + f, 'utf8'));

// Where the single expected issue of each invalid fixture must point.
const expectedPath: Record<string, (string | number)[]> = {
  'invalid-duplicate-number.json': ['questions', 1, 'number'],
  'invalid-bad-answer.json': ['questions', 3, 'answer'],
  'invalid-one-option.json': ['questions', 1, 'options'],
  'invalid-empty-questions.json': ['questions'],
  'invalid-missing-title.json': ['title'],
  'invalid-option-letter.json': ['questions', 0, 'options', 'G'],
};

describe('MCQ fixtures', () => {
  it('every fixture is named valid-* or invalid-*', () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(f, f).toMatch(/^(valid|invalid)-/);
  });

  it('every invalid fixture has an expected path, and none is stale', () => {
    const invalid = files.filter((f) => f.startsWith('invalid-')).sort();
    expect(Object.keys(expectedPath).sort()).toEqual(invalid);
  });

  describe.each(files.filter((f) => f.startsWith('valid-')))('%s', (f) => {
    it('passes McqImportRequest', () => {
      const r = McqImportRequest.safeParse(load(f));
      expect(r.success, r.success ? '' : JSON.stringify(r.error.issues)).toBe(true);
    });
  });

  describe.each(files.filter((f) => f.startsWith('invalid-')))('%s', (f) => {
    it('fails McqImportRequest with exactly one issue at the expected path', () => {
      const r = McqImportRequest.safeParse(load(f));
      expect(r.success).toBe(false);
      if (r.success) return;
      expect(r.error.issues.map((i) => i.path)).toEqual([expectedPath[f]]);
    });
  });

  it('valid-basic matches the requested mix', () => {
    const r = McqImportRequest.parse(load('valid-basic.json'));
    const qs = r.questions;
    expect(r.title).toBe('Scheduling MCQs - Set 1');
    expect(qs).toHaveLength(5);
    const optionCounts = qs.map((q) => Object.keys(q.options).length);
    expect(optionCounts).toContain(4);
    expect(optionCounts).toContain(2);
    expect(qs.filter((q) => q.answer === null && q.explanation === null)).toHaveLength(1);
    expect(qs.filter((q) => q.explanation !== null)).toHaveLength(1);
    const withPage = qs.filter((q) => q.reference?.filename === 'OS-Notes.pdf' && q.reference.page);
    expect(withPage).toHaveLength(3);
    expect(qs.filter((q) => q.reference && q.reference.page === undefined)).toHaveLength(1);
  });

  it('valid-hindi keeps Devanagari text intact', () => {
    const r = McqImportRequest.parse(load('valid-hindi.json'));
    expect(r.questions).toHaveLength(2);
    for (const q of r.questions) {
      const text = [q.question, ...Object.values(q.options), q.explanation ?? ''];
      for (const t of text) expect(t).toMatch(/[\u0900-\u097F]/);
    }
  });

  it('valid-max-options has 6 options A to F', () => {
    const r = McqImportRequest.parse(load('valid-max-options.json'));
    expect(Object.keys(r.questions[0]!.options)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('valid-missing-reference points at Missing.pdf (schema accepts it; B5.3 rejects it)', () => {
    const r = McqImportRequest.parse(load('valid-missing-reference.json'));
    expect(r.questions[0]?.reference?.filename).toBe('Missing.pdf');
  });
});
