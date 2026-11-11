/**
 * Reports a handled error.
 *
 * @param context - Where the error happened.
 * @param error - Thrown value.
 */
export const reportError = (context: string, error: unknown): void => {
  console.error(`[${context}]`, error);
};
