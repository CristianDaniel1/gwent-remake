import { getLegalActions, isLegalAction } from '../core/legal-actions';
import type { RandomSource } from '../core/rng';
import type { GameAction } from '../model/actions';
import type { PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { planChoice } from './choices';
import { planRedraw, planTurn } from './turn';

/**
 * Move the bot would make now, or null when it is not its turn to act.
 * May return an illegal action if the weights have a bug: use chooseAiAction in the game.
 */
export function planAiAction(
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
): GameAction | null {
  if (state.pendingChoice) {
    return state.pendingChoice.player === player
      ? planChoice(state, state.pendingChoice, rng)
      : null;
  }
  const me = state.players[player];
  if (state.phase === 'redraw') return me.redrawDone ? null : planRedraw(state, player, rng);
  if (state.phase === 'playing' && state.currentPlayer === player && !me.passed) {
    return planTurn(state, player, rng);
  }
  return null;
}

/**
 * Rule-based bot. Pure function: same input,
 * same `rng` → same move. Always returns a legal action (or null when it is not its turn).
 */
export function chooseAiAction(
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
): GameAction | null {
  const planned = planAiAction(state, player, rng);
  if (!planned) return null;
  if (isLegalAction(state, planned)) return planned;
  // Safety net: never stall the match because of a wrong weight.
  const legal = getLegalActions(state, player);
  return legal.find((a) => a.type === 'PASS' || a.type === 'END_REDRAW') ?? legal[0] ?? null;
}
