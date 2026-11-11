import {
  getLegalActions,
  PLAYER_IDS,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@gwent/engine';

/**
 * Lists who needs to act now (during the initial redraw, both players at once).
 *
 * @param state - Current match state.
 * @returns The players the match is waiting for; empty when the match is over.
 */
export const waitingFor = (state: GameState): PlayerId[] => {
  if (state.phase === 'gameOver') return [];
  if (state.pendingChoice) return [state.pendingChoice.player];
  if (state.phase === 'redraw') {
    return PLAYER_IDS.filter((player) => !state.players[player].redrawDone);
  }
  return state.currentPlayer ? [state.currentPlayer] : [];
};

/**
 * Picks the automatic move when the turn time runs out: ends the redraw, answers the choice with
 * the first option or passes the round.
 *
 * @param state - Current match state.
 * @param player - Player who ran out of time.
 * @returns The automatic action, or null when the player has none.
 */
export const timeoutAction = (state: GameState, player: PlayerId): GameAction | null => {
  const legal = getLegalActions(state, player);
  return (
    legal.find((action) => action.type === 'END_REDRAW') ??
    legal.find((action) => action.type === 'CHOOSE') ??
    legal.find((action) => action.type === 'PASS') ??
    null
  );
};
