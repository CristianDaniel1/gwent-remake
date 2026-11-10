import type { GameAction } from '../model/actions';
import type { PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import type { PendingChoice } from '../model/tasks';
import { playOptions } from './play';
import { canUseLeader } from './turn-flow';

/** Every combination of `min` to `max` options (in option order). */
function choiceCombinations(choice: PendingChoice): string[][] {
  const ids = choice.options.map((o) => o.id);
  const out: string[][] = [];
  const walk = (start: number, picked: string[]) => {
    if (picked.length >= choice.min) out.push([...picked]);
    if (picked.length === choice.max) return;
    for (let i = start; i < ids.length; i++) walk(i + 1, [...picked, ids[i] as string]);
  };
  walk(0, []);
  return out;
}

/**
 * Every action the player can take now. Single source of truth:
 * the UI uses it to highlight options, the bot to choose and the engine to validate.
 */
export function getLegalActions(state: GameState, player: PlayerId): GameAction[] {
  if (state.pendingChoice) {
    if (state.pendingChoice.player !== player) return [];
    return choiceCombinations(state.pendingChoice).map((optionIds) => ({
      type: 'CHOOSE',
      player,
      optionIds,
    }));
  }

  const me = state.players[player];
  switch (state.phase) {
    case 'setup':
    case 'gameOver':
      return [];

    case 'redraw': {
      if (me.redrawDone) return [];
      const actions: GameAction[] = [{ type: 'END_REDRAW', player }];
      if (me.redrawsLeft > 0 && me.deck.length > 0) {
        for (const cardId of me.hand) actions.push({ type: 'REDRAW', player, cardId });
      }
      return actions;
    }

    case 'playing': {
      if (state.currentPlayer !== player || me.passed) return [];
      const actions: GameAction[] = [];
      for (const cardId of me.hand) {
        for (const option of playOptions(state, player, cardId)) {
          actions.push({ type: 'PLAY_CARD', player, cardId, ...option });
        }
      }
      if (canUseLeader(state, player)) actions.push({ type: 'ACTIVATE_LEADER', player });
      actions.push({ type: 'PASS', player });
      return actions;
    }
  }
}

/** Fills in/sorts fields to compare against the legal actions. */
export function normalizeAction(state: GameState, action: GameAction): GameAction {
  if (action.type === 'PLAY_CARD' && state.cards[action.cardId] && state.players[action.player]) {
    if (action.row === undefined && action.targetId === undefined) {
      // Only one way to play it (e.g. fixed-row unit, weather): fill it in automatically.
      const options = playOptions(state, action.player, action.cardId);
      if (options.length === 1 && options[0]) return { ...action, ...options[0] };
    }
  }
  if (action.type === 'CHOOSE' && state.pendingChoice) {
    const order = state.pendingChoice.options.map((o) => o.id);
    return {
      ...action,
      optionIds: [...action.optionIds].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    };
  }
  return action;
}

const actionKey = (a: GameAction) =>
  JSON.stringify(Object.entries(a).sort(([x], [y]) => x.localeCompare(y)));

export function isLegalAction(state: GameState, action: GameAction): boolean {
  const key = actionKey(normalizeAction(state, action));
  return getLegalActions(state, action.player).some((a) => actionKey(a) === key);
}
