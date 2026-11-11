import type { DeckIssue } from '@gwent/engine';

/** Issues a saved deck may have while still under construction; any other issue is rejected. */
export const ALLOWED_WHILE_BUILDING: ReadonlySet<DeckIssue['code']> = new Set([
  'NOT_ENOUGH_UNITS',
  'TOO_MANY_SPECIALS',
]);
