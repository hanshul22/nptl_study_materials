import { describe, it } from 'vitest';
import { DocumentDto, DocumentStatus } from '../src/schemas/documents.js';
import { bad, DATE, ID, ID2, ok } from './helpers.js';

describe('DocumentStatus', () => {
  it('accepts the three statuses only', () => {
    for (const s of ['processing', 'ready', 'failed']) ok(DocumentStatus, s);
    bad(DocumentStatus, 'done');
    bad(DocumentStatus, 'READY');
    bad(DocumentStatus, undefined);
  });
});

describe('DocumentDto', () => {
  const ready = {
    id: ID,
    topicId: ID2,
    filename: 'OS-Notes.pdf',
    sizeBytes: 1024,
    pageCount: 100,
    chunkCount: 250,
    status: 'ready',
    errorCode: null,
    errorMessage: null,
    createdAt: DATE,
  };
  it('accepts ready, processing (pageCount null) and failed documents', () => {
    ok(DocumentDto, ready);
    ok(DocumentDto, { ...ready, status: 'processing', pageCount: null, chunkCount: 0 });
    ok(DocumentDto, {
      ...ready,
      status: 'failed',
      errorCode: 'PDF_NO_TEXT',
      errorMessage: 'No extractable text',
    });
  });
  it('rejects missing fields', () => {
    for (const key of Object.keys(ready)) {
      const copy: Record<string, unknown> = { ...ready };
      delete copy[key];
      bad(DocumentDto, copy);
    }
  });
  it('rejects wrong types and invalid values', () => {
    bad(DocumentDto, { ...ready, status: 'unknown' });
    bad(DocumentDto, { ...ready, sizeBytes: 1.5 });
    bad(DocumentDto, { ...ready, pageCount: '10' });
    bad(DocumentDto, { ...ready, pageCount: undefined });
    bad(DocumentDto, { ...ready, topicId: 'nope' });
    bad(DocumentDto, { ...ready, createdAt: 'today' });
    bad(DocumentDto, { ...ready, errorCode: 5 });
  });
});
