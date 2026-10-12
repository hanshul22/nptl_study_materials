import { ERROR_HTTP_STATUS, type ApiError, type ErrorCode } from '@study/shared';
import { HttpResponse } from 'msw';
import type { ApiErrorDetail } from '../api';

/** ApiError envelope (HttpResponse.json) with the HTTP status from the shared table. */
export function apiErrorResponse(
  code: ErrorCode,
  message: string,
  details?: ApiErrorDetail[],
): Response {
  const body: ApiError = { error: { code, message, ...(details && { details }) } };
  return HttpResponse.json(body, { status: ERROR_HTTP_STATUS[code] });
}

/** VALIDATION_ERROR (400) with `details` built from zod issues. */
export function validationErrorResponse(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Response {
  return apiErrorResponse(
    'VALIDATION_ERROR',
    'Request validation failed',
    issues.map((i) => ({
      path: i.path.map((p) => (typeof p === 'number' ? p : String(p))),
      message: i.message,
    })),
  );
}
