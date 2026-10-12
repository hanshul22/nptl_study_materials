import type { EndpointDef } from '@study/shared';
import { env, isDev } from '../lib/env';
import { ApiClientError } from './errors';

export type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  /** Values for `:name` segments of `endpoint.path`. */
  params?: Record<string, string | number>;
  query?: Record<string, QueryValue>;
  /** Plain object (sent as JSON) or FormData (sent as multipart). */
  body?: unknown;
}

/** Response type inferred from `endpoint.response`; `undefined` when the endpoint has none. */
export type ResponseOf<E extends EndpointDef> = E extends {
  response: { parse(data: unknown): infer O };
}
  ? O
  : undefined;

export interface ApiClientConfig {
  baseUrl: string;
  /** Dev-time checks: validate request bodies and responses against the shared schemas. */
  validate: boolean;
  fetchImpl?: typeof fetch;
}

function fillPath(path: string, params: RequestOptions['params'] = {}): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing path param ":${name}" for ${path}`);
    return encodeURIComponent(String(value));
  });
}

function toQueryString(query: RequestOptions['query'] = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.append(key, String(value));
  }
  return search.toString();
}

export function createApiClient({ baseUrl, validate, fetchImpl }: ApiClientConfig) {
  const base = baseUrl.replace(/\/+$/, '');
  // Resolve globalThis.fetch per call so tests can stub it after the client is created.
  const doFetch: typeof fetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  return async function request<E extends EndpointDef>(
    endpoint: E,
    { params, query, body }: RequestOptions = {},
  ): Promise<ResponseOf<E>> {
    const qs = toQueryString(query);
    const url = `${base}${fillPath(endpoint.path, params)}${qs ? `?${qs}` : ''}`;

    const init: RequestInit = { method: endpoint.method };
    if (body instanceof FormData) {
      // No Content-Type: the browser adds the multipart boundary.
      init.body = body;
    } else if (body !== undefined) {
      if (validate && endpoint.request) {
        const checked = endpoint.request.safeParse(body);
        if (!checked.success) {
          throw new Error(
            `Invalid request body for ${endpoint.method} ${endpoint.path}: ${JSON.stringify(checked.error.issues)}`,
          );
        }
      }
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await doFetch(url, init);
    } catch (cause) {
      throw ApiClientError.network(cause);
    }

    if (!res.ok) {
      const errBody: unknown = await res.json().catch(() => undefined);
      throw ApiClientError.fromBody(res.status, errBody);
    }
    if (res.status === 204) return undefined as ResponseOf<E>;

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw ApiClientError.invalidResponse(res.status);
    }

    if (validate && endpoint.response) {
      const checked = endpoint.response.safeParse(data);
      if (!checked.success) {
        console.error(
          `Response validation failed for ${endpoint.method} ${endpoint.path}`,
          checked.error.issues,
        );
        throw ApiClientError.invalidResponse(res.status);
      }
    }
    return data as ResponseOf<E>;
  };
}

/** Default client: base URL from env, validation on in dev only. */
export const request = createApiClient({ baseUrl: env.apiUrl, validate: isDev });

/** Absolute API URL for links (e.g. PdfLink). */
export const apiUrl = (path: string): string => env.apiUrl + path;
