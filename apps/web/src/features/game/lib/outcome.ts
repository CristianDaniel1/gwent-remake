import type { MatchResult, PlayerId } from '@gwent/engine';
import type { MatchOutcome } from '../interfaces/outcome';

/**
 * Computes the match outcome from the human's side.
 *
 * @param result - Match result.
 * @param human - Human player.
 * @returns Win, lose or draw.
 */
export const outcomeFor = (result: MatchResult | null, human: PlayerId): MatchOutcome => {
  if (result === 'draw') return 'draw';
  return result === human ? 'win' : 'lose';
};
