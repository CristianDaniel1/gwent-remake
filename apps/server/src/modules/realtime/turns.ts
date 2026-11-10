import {
  getLegalActions,
  PLAYER_IDS,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@gwent/engine';

/** Who needs to act now (during the initial redraw, both at once). */
export function waitingFor(state: GameState): PlayerId[] {
  if (state.phase === 'gameOver') return [];
  if (state.pendingChoice) return [state.pendingChoice.player];
  if (state.phase === 'redraw') return PLAYER_IDS.filter((p) => !state.players[p].redrawDone);
  return state.currentPlayer ? [state.currentPlayer] : [];
}

/**
 * Automatic move when the turn time runs out: ends the redraw, answers the choice
 * with the first option or passes the round.
 */
export function timeoutAction(state: GameState, player: PlayerId): GameAction | null {
  const legal = getLegalActions(state, player);
  return (
    legal.find((a) => a.type === 'END_REDRAW') ??
    legal.find((a) => a.type === 'CHOOSE') ??
    legal.find((a) => a.type === 'PASS') ??
    null
  );
}
