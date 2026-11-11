import { isRouteErrorResponse } from 'react-router';

/**
 * Builds a readable message for any thrown value.
 *
 * @param error - Thrown value.
 * @returns The message.
 */
export const errorMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.message;
  return String(error);
};
