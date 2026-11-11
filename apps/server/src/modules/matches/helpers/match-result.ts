import type { GameState, PlayerId } from '@gwent/engine';
import type { MatchResultKind } from '@gwent/shared';

/**
 * Reads the result of a finished match from one seat's point of view.
 *
 * @param state - Final match state.
 * @param side - Seat to read the result for.
 * @returns Win, loss or draw for that seat.
 */
export const resultFor = (state: GameState, side: PlayerId): MatchResultKind => {
  if (state.result === 'draw') return 'draw';
  return state.result === side ? 'win' : 'loss';
};
