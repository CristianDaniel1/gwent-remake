import type { Prisma } from '../../../generated/prisma/client';

/** Maximum matches returned by the history list. */
export const MATCH_HISTORY_LIMIT = 50;

/** Columns returned by the history list (without the actions, which can be large). */
export const MATCH_SUMMARY_SELECT = {
  id: true,
  mode: true,
  side: true,
  faction: true,
  opponent: true,
  opponentName: true,
  mutators: true,
  result: true,
  rounds: true,
  createdAt: true,
} as const satisfies Prisma.MatchSelect;

/** Injection token of the MatchRecorder used by the multiplayer rooms. */
export const MATCH_RECORDER = Symbol('MATCH_RECORDER');
