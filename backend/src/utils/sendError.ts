import type { Response } from 'express';
import { ERROR_HTTP_STATUS, type ApiError, type ErrorCode } from '@study/shared';

export type ErrorDetails = NonNullable<ApiError['error']['details']>;

/** Writes the ApiError envelope (dtos.md section 9) with the status mapped from `code`. */
export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  details?: ErrorDetails,
): void {
  const body: ApiError = { error: { code, message, ...(details && { details }) } };
  res.status(ERROR_HTTP_STATUS[code]).json(body);
}
