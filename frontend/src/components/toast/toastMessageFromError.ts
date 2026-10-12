import { ApiClientError } from '../../api';

/**
 * Safe text for an error toast. ApiClientError messages come from the server error envelope or
 * are generic client messages (never raw response text); anything else gets a generic message.
 */
export function toastMessageFromError(err: unknown): string {
  return err instanceof ApiClientError ? err.message : 'Something went wrong';
}
