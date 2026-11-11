/**
 * Checks whether the user asked the system to reduce motion.
 *
 * @returns True when motion should be reduced.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
