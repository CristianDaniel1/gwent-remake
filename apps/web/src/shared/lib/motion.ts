/**
 * The person asked the system to reduce motion: the board skips the pauses that only exist
 * to show a move (the opponent's card enlarged, burning, cards flying from the piles).
 * The new state shows right away; notices still stay long enough to be read.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
