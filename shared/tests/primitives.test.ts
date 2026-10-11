import { describe, expect, it } from 'vitest';
import { IsoDate, ObjectIdStr, OptionLetter } from '../src/schemas/primitives.js';
import { bad, ok } from './helpers.js';

describe('ObjectIdStr', () => {
  it('accepts 24 hex chars, case-insensitive', () => {
    ok(ObjectIdStr, '507f1f77bcf86cd799439011');
    ok(ObjectIdStr, '507F1F77BCF86CD799439011');
    ok(ObjectIdStr, '507f1F77bcF86cd799439011');
  });
  it('rejects wrong length, non-hex, and non-strings', () => {
    bad(ObjectIdStr, '507f1f77bcf86cd79943901'); // 23
    bad(ObjectIdStr, '507f1f77bcf86cd7994390111'); // 25
    bad(ObjectIdStr, '507f1f77bcf86cd79943901g'); // non-hex
    bad(ObjectIdStr, '');
    bad(ObjectIdStr, ' 507f1f77bcf86cd799439011');
    bad(ObjectIdStr, 123);
    bad(ObjectIdStr, null);
  });
});

describe('IsoDate', () => {
  it('accepts ISO 8601 UTC datetimes', () => {
    ok(IsoDate, '2026-10-11T10:00:00.000Z');
    ok(IsoDate, '2026-10-11T10:00:00Z');
  });
  it('rejects date-only, offsets, garbage, and non-strings', () => {
    bad(IsoDate, '2026-10-11');
    bad(IsoDate, '2026-10-11T10:00:00+02:00');
    bad(IsoDate, '2026-13-45T10:00:00.000Z');
    bad(IsoDate, 'yesterday');
    bad(IsoDate, new Date());
    bad(IsoDate, 1760176800000);
  });
});

describe('OptionLetter', () => {
  it('accepts A to F only', () => {
    for (const l of ['A', 'B', 'C', 'D', 'E', 'F']) ok(OptionLetter, l);
    for (const l of ['G', 'a', '', 'AB', '1']) bad(OptionLetter, l);
    expect(OptionLetter.safeParse('f').success).toBe(false);
  });
});
