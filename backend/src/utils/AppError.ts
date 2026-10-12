import { ERROR_HTTP_STATUS, type ErrorCode } from '@study/shared';
import type { ErrorDetails } from './sendError.js';

/** Expected failure that the error middleware turns into the ApiError envelope. */
export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: ErrorDetails,
  ) {
    super(message); // no `cause`: it could carry secrets
    this.name = 'AppError';
    this.status = ERROR_HTTP_STATUS[code];
  }
}
