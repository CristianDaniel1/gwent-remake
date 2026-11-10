import { produce } from 'immer';
import type { GameAction } from '../model/actions';
import type { GameEvent } from '../model/events';
import type { GameState } from '../model/state';
import { getAbility, getMechanic } from '../mechanics/registry';
import { createContext, type RunnerContext } from './context';
import type { GameUpdate } from './create-game';
import { isLegalAction, normalizeAction } from './legal-actions';
import { resolvePlay } from './play';
import { runStack } from './stack';
import { endRedraw } from './turn-flow';
import { defOf } from './zones';

export type ActionErrorCode =
  'GAME_OVER' | 'CHOICE_PENDING' | 'WRONG_PHASE' | 'NOT_YOUR_TURN' | 'ILLEGAL_ACTION';

export type ActionResult =
  ({ ok: true } & GameUpdate) | { ok: false; error: { code: ActionErrorCode; action: GameAction } };

function diagnose(state: GameState, action: GameAction): ActionErrorCode {
  if (state.phase === 'gameOver') return 'GAME_OVER';
  if (state.pendingChoice && action.type !== 'CHOOSE') return 'CHOICE_PENDING';
  const redrawAction = action.type === 'REDRAW' || action.type === 'END_REDRAW';
  if (redrawAction !== (state.phase === 'redraw')) return 'WRONG_PHASE';
  if (state.phase === 'playing' && state.currentPlayer !== action.player) return 'NOT_YOUR_TURN';
  return 'ILLEGAL_ACTION';
}

type Handlers = {
  [T in GameAction['type']]: (ctx: RunnerContext, action: Extract<GameAction, { type: T }>) => void;
};

const handlers: Handlers = {
  REDRAW(ctx, { player, cardId }) {
    const me = ctx.state.players[player];
    const index = me.hand.indexOf(cardId);
    const drawn = me.deck.shift();
    if (index < 0 || !drawn) throw new Error('Invalid REDRAW passed validation');
    // The redrawn card goes to the bottom of the deck; the new one takes its place in the hand.
    me.deck.push(cardId);
    me.hand[index] = drawn;
    me.redrawsLeft -= 1;
    ctx.emit({ type: 'CARD_REDRAWN', player, returned: cardId, drawn });
    if (me.redrawsLeft === 0) endRedraw(ctx, player);
  },

  END_REDRAW(ctx, { player }) {
    endRedraw(ctx, player);
  },

  PLAY_CARD(ctx, { player, cardId, row, targetId }) {
    ctx.emit({
      type: 'CARD_PLAYED',
      player,
      cardId,
      ...(row ? { row } : {}),
      ...(targetId ? { targetId } : {}),
    });
    resolvePlay(ctx, player, cardId, {
      ...(row ? { row } : {}),
      ...(targetId ? { targetId } : {}),
    });
    ctx.schedule({ type: 'HOOKS', hook: 'turnEnd' }, { type: 'END_TURN' });
  },

  ACTIVATE_LEADER(ctx, { player }) {
    const me = ctx.state.players[player];
    me.leaderAvailable = false;
    ctx.emit({ type: 'LEADER_ACTIVATED', player, cardId: me.leader });
    const ability = defOf(ctx.state, me.leader)
      .abilities.map((a) => getAbility(a))
      .find((a) => a?.onActivate);
    ability?.onActivate?.(ctx, player);
    ctx.schedule({ type: 'HOOKS', hook: 'turnEnd' }, { type: 'END_TURN' });
  },

  PASS(ctx, { player }) {
    ctx.state.players[player].passed = true;
    ctx.emit({ type: 'PLAYER_PASSED', player, automatic: false });
    ctx.schedule({ type: 'HOOKS', hook: 'turnEnd' }, { type: 'END_TURN' });
  },

  CHOOSE(ctx, { optionIds }) {
    const choice = ctx.state.pendingChoice;
    if (!choice) throw new Error('CHOOSE without a pending choice passed validation');
    ctx.state.pendingChoice = null;
    const handler = getMechanic(choice.resume.ref)?.choices?.[choice.resume.name];
    if (!handler) throw new Error(`Choice without a continuation: ${choice.resume.name}`);
    handler(ctx, optionIds, choice.resume.data);
  },
};

/**
 * Applies an action and returns the new state + the generated events. Pure function:
 * the given state is never mutated. Illegal actions return an error instead of throwing.
 */
export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (!isLegalAction(state, action)) {
    return { ok: false, error: { code: diagnose(state, action), action } };
  }
  const normalized = normalizeAction(state, action);
  const events: GameEvent[] = [];
  const next = produce(state, (draft) => {
    const ctx = createContext(draft, events);
    const handler = handlers[normalized.type] as (ctx: RunnerContext, a: GameAction) => void;
    handler(ctx, normalized);
    runStack(ctx);
  });
  return { ok: true, state: next, events };
}
