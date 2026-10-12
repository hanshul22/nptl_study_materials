import { describe, expect, it } from 'vitest';
import { DEFAULT_API_URL, parseEnv } from './env';

describe('parseEnv apiUrl', () => {
  it('defaults when missing, empty or blank', () => {
    expect(parseEnv({}).apiUrl).toBe(DEFAULT_API_URL);
    expect(parseEnv({ VITE_API_URL: '' }).apiUrl).toBe(DEFAULT_API_URL);
    expect(parseEnv({ VITE_API_URL: '   ' }).apiUrl).toBe(DEFAULT_API_URL);
  });

  it('trims and strips trailing slashes', () => {
    expect(parseEnv({ VITE_API_URL: ' https://api.example.com/api/v1/ ' }).apiUrl).toBe(
      'https://api.example.com/api/v1',
    );
    expect(parseEnv({ VITE_API_URL: 'https://api.example.com//' }).apiUrl).toBe(
      'https://api.example.com',
    );
  });
});

describe('parseEnv useMocks', () => {
  it.each(['true', 'TRUE', ' true ', 'True'])('%j is true', (v) => {
    expect(parseEnv({ VITE_USE_MOCKS: v }).useMocks).toBe(true);
  });

  it.each(['false', '1', '', 'yes', undefined])('%j is false', (v) => {
    expect(parseEnv({ VITE_USE_MOCKS: v }).useMocks).toBe(false);
  });
});
