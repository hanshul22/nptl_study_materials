import { describe, expect, it } from 'vitest';
import { ApiError, ERROR_CODES, ERROR_HTTP_STATUS } from '../src/schemas/errors.js';
import { bad, ok } from './helpers.js';

describe('ApiError', () => {
  it('accepts an envelope without details', () => {
    ok(ApiError, { error: { code: 'NOT_FOUND', message: 'Topic not found' } });
  });
  it('accepts details with string and number path segments', () => {
    ok(ApiError, {
      error: {
        code: 'MCQ_IMPORT_INVALID',
        message: 'Import failed',
        details: [
          { path: ['questions', 3, 'answer'], message: 'answer must be one of the option letters' },
          { path: [], message: 'root issue' },
        ],
      },
    });
  });
  it('rejects missing code, message, or error wrapper', () => {
    bad(ApiError, { error: { message: 'x' } });
    bad(ApiError, { error: { code: 'X' } });
    bad(ApiError, { code: 'X', message: 'x' });
    bad(ApiError, {});
  });
  it('rejects malformed details', () => {
    const base = { code: 'X', message: 'x' };
    bad(ApiError, { error: { ...base, details: 'nope' } });
    bad(ApiError, { error: { ...base, details: [{ message: 'no path' }] } });
    bad(ApiError, { error: { ...base, details: [{ path: [true], message: 'x' }] } });
    bad(ApiError, { error: { ...base, details: [{ path: ['a'] }] } });
  });
});

describe('ERROR_CODES', () => {
  it('has 16 unique entries', () => {
    expect(ERROR_CODES).toHaveLength(16);
    expect(new Set(ERROR_CODES).size).toBe(16);
  });
});

describe('ERROR_HTTP_STATUS', () => {
  it('covers every error code and nothing else', () => {
    expect(Object.keys(ERROR_HTTP_STATUS).sort()).toEqual([...ERROR_CODES].sort());
  });
  // dtos.md section 9
  it('matches the HTTP column of the error table', () => {
    expect(ERROR_HTTP_STATUS).toEqual({
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      DUPLICATE_DOCUMENT: 409,
      DUPLICATE_TOPIC: 409,
      FILE_TOO_LARGE: 413,
      UNSUPPORTED_FILE_TYPE: 415,
      PDF_ENCRYPTED: 422,
      PDF_NO_TEXT: 422,
      PDF_TOO_MANY_PAGES: 422,
      MCQ_IMPORT_INVALID: 422,
      AI_NOT_CONFIGURED: 503,
      AI_RATE_LIMITED: 429,
      AI_UNAVAILABLE: 502,
      RATE_LIMITED: 429,
      EXPORT_FAILED: 500,
      INTERNAL: 500,
    });
  });
});
