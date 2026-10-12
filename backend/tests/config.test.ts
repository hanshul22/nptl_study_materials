import { describe, expect, it } from 'vitest';
import { ConfigError, parseConfig } from '../src/config/env.js';

const minimal = { MONGODB_URI: 'mongodb://user:s3cret-pw@host/db', FRONTEND_ORIGIN: 'http://localhost:5173' };

const errorOf = (env: Record<string, string | undefined>): ConfigError => {
  try {
    parseConfig(env);
  } catch (e) {
    expect(e).toBeInstanceOf(ConfigError);
    return e as ConfigError;
  }
  throw new Error('expected parseConfig to throw');
};

describe('parseConfig', () => {
  it('parses a valid minimal env', () => {
    const c = parseConfig(minimal);
    expect(c.MONGODB_URI).toBe(minimal.MONGODB_URI);
    expect(c.FRONTEND_ORIGIN).toBe('http://localhost:5173');
  });

  it('applies defaults', () => {
    expect(parseConfig(minimal)).toMatchObject({
      PORT: 4000,
      STORAGE_DRIVER: 'local',
      STORAGE_LOCAL_DIR: './data/pdf',
      TMP_DIR: './data/tmp',
      MAX_PDF_MB: 25,
      MAX_PDF_PAGES: 300,
      AI_RATE_LIMIT_PER_MIN: 20,
    });
  });

  it('coerces numeric strings and rejects non-numeric ones', () => {
    const c = parseConfig({ ...minimal, PORT: '8080', MAX_PDF_MB: '10', MAX_PDF_PAGES: '50', AI_RATE_LIMIT_PER_MIN: '5' });
    expect(c).toMatchObject({ PORT: 8080, MAX_PDF_MB: 10, MAX_PDF_PAGES: 50, AI_RATE_LIMIT_PER_MIN: 5 });
    expect(errorOf({ ...minimal, PORT: 'abc' }).issues.map((i) => i.name)).toEqual(['PORT']);
  });

  it('fails when MONGODB_URI is missing', () => {
    expect(errorOf({ FRONTEND_ORIGIN: minimal.FRONTEND_ORIGIN }).issues.map((i) => i.name)).toEqual(['MONGODB_URI']);
  });

  it('fails when FRONTEND_ORIGIN is missing', () => {
    expect(errorOf({ MONGODB_URI: minimal.MONGODB_URI }).issues.map((i) => i.name)).toEqual(['FRONTEND_ORIGIN']);
  });

  it('treats empty strings as missing (required fails, optional/defaulted fall back)', () => {
    expect(errorOf({ ...minimal, MONGODB_URI: '' }).issues.map((i) => i.name)).toEqual(['MONGODB_URI']);
    const c = parseConfig({ ...minimal, PORT: '', OPENROUTER_API_KEY: '', OPENROUTER_MODEL: '' });
    expect(c.PORT).toBe(4000);
    expect(c.OPENROUTER_API_KEY).toBeUndefined();
    expect(c.OPENROUTER_MODEL).toBeUndefined();
  });

  it('names every bad variable but never prints a value', () => {
    const env = {
      MONGODB_URI: '',
      FRONTEND_ORIGIN: 'not-a-url-SECRET1',
      MAX_PDF_MB: 'bad-SECRET2',
      STORAGE_DRIVER: 's3-SECRET3',
    };
    const msg = errorOf(env).message;
    for (const name of ['MONGODB_URI', 'FRONTEND_ORIGIN', 'MAX_PDF_MB', 'STORAGE_DRIVER']) {
      expect(msg).toContain(name);
    }
    expect(msg).not.toMatch(/SECRET/);
  });

  it('starts without OPENROUTER_* set', () => {
    const c = parseConfig(minimal);
    expect(c.OPENROUTER_API_KEY).toBeUndefined();
    expect(c.OPENROUTER_MODEL).toBeUndefined();
    expect(parseConfig({ ...minimal, OPENROUTER_API_KEY: 'k', OPENROUTER_MODEL: 'm' })).toMatchObject({
      OPENROUTER_API_KEY: 'k',
      OPENROUTER_MODEL: 'm',
    });
  });

  it('normalises FRONTEND_ORIGIN to a bare origin', () => {
    expect(parseConfig({ ...minimal, FRONTEND_ORIGIN: 'http://localhost:5173/' }).FRONTEND_ORIGIN).toBe('http://localhost:5173');
  });
});
