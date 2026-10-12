import { ApiError } from '@study/shared';

/** Codes produced by the client itself. Server codes live in shared `ERROR_CODES`. */
export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
} as const;

export type ApiErrorDetail = NonNullable<ApiError['error']['details']>[number];

export interface ApiClientErrorInit {
  status: number;
  code: string;
  message: string;
  details?: ApiErrorDetail[] | undefined;
  cause?: unknown;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[] | undefined;

  constructor({ status, code, message, details, cause }: ApiClientErrorInit) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Build from a non-2xx response body. Anything that is not a valid ApiError becomes HTTP_ERROR. */
  static fromBody(status: number, body: unknown): ApiClientError {
    const parsed = ApiError.safeParse(body);
    if (!parsed.success) {
      return new ApiClientError({
        status,
        code: CLIENT_ERROR_CODES.HTTP_ERROR,
        message: `Request failed with status ${status}`,
      });
    }
    const { code, message, details } = parsed.data.error;
    return new ApiClientError({ status, code, message, details });
  }

  static network(cause: unknown): ApiClientError {
    return new ApiClientError({
      status: 0,
      code: CLIENT_ERROR_CODES.NETWORK_ERROR,
      message: 'Could not reach the server',
      cause,
    });
  }

  static invalidResponse(status: number): ApiClientError {
    return new ApiClientError({
      status,
      code: CLIENT_ERROR_CODES.INVALID_RESPONSE,
      message: 'The server response did not match the expected format',
    });
  }
}
