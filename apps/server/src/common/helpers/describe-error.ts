/**
 * Turns a thrown value into text for the logs.
 *
 * @param error - Value caught in a catch block.
 * @returns The stack of an Error, or the value as text.
 */
export const describeError = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);
