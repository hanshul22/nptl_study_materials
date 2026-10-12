export const DEFAULT_API_URL = 'http://localhost:4000/api/v1';

export interface RawEnv {
  VITE_API_URL?: string | undefined;
  VITE_USE_MOCKS?: string | undefined;
}

export interface Env {
  apiUrl: string;
  useMocks: boolean;
}

/** Pure: turns raw `import.meta.env` values into typed config. */
export function parseEnv(raw: RawEnv): Env {
  const apiUrl = (raw.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  return {
    apiUrl: apiUrl || DEFAULT_API_URL,
    useMocks: (raw.VITE_USE_MOCKS ?? '').trim().toLowerCase() === 'true',
  };
}

export const env: Env = parseEnv(import.meta.env);
export const isDev: boolean = import.meta.env.DEV;
