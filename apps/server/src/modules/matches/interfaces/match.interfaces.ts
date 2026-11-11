import type { GameState, PlayerId, RoundResult } from '@gwent/engine';
import type { CreateMatch, MatchMode, MatchResultKind } from '@gwent/shared';
import type { Prisma } from '../../../generated/prisma/client';
import type { MATCH_SUMMARY_SELECT } from '../constants/matches.constants';

/** Finished match ready to be saved in one profile's history. */
export interface NewMatch extends CreateMatch {
  mode: MatchMode;
  /** Seat the profile played. */
  side: PlayerId;
  opponentName: string | null;
  /** From the profile's point of view. */
  result: MatchResultKind;
  rounds: RoundResult[];
}

/** One history entry: the profile and the match from its point of view. */
export interface MatchHistoryEntry {
  profileId: string;
  match: NewMatch;
}

/** Row returned by the history list. */
export type MatchSummaryRow = Prisma.MatchGetPayload<{ select: typeof MATCH_SUMMARY_SELECT }>;

/** Result of replaying a match. */
export interface ReplayOutcome {
  state: GameState;
  /** From p1's point of view (use resultFor for p2). */
  result: MatchResultKind;
  rounds: RoundResult[];
}
