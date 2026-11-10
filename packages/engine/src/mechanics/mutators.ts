// Match-wide rule changes ("mutators"), chosen before the match. Each one uses a different
// extension point of the engine: setup, start hooks, turn hooks and round hooks.
import { drawCards } from '../core/board';
import { defOf, isRegularUnit } from '../core/zones';
import { COMBAT_ROWS } from '../model/card';
import type { MutatorDefinition } from './types';

/** Extra cards each player draws at the start with "Full hands". */
export const FULL_HANDS_EXTRA = 2;

/** Each player starts with 12 cards instead of 10. */
const fullHands: MutatorDefinition = {
  id: 'fullHands',
  hooks: {
    // Runs before the hands are dealt (like Francesca, Daisy of the Valley)
    gameStart: (ctx, owner) => {
      drawCards(ctx, owner, FULL_HANDS_EXTRA);
      ctx.emit({ type: 'MUTATOR_TRIGGERED', mutator: 'fullHands', player: owner });
    },
  },
};

/** No leader abilities for anyone (activatable or passive). */
const noLeaders: MutatorDefinition = {
  id: 'noLeaders',
  setup: (state) => {
    for (const player of Object.values(state.players)) {
      player.leaderAvailable = false;
      player.leaderDisabled = true;
    }
  },
};

/**
 * After each move (not a pass), a random regular unit on the mover's side gets +1 strength
 * for as long as it stays on the board. Weather still sets it to 1.
 */
const inspiration: MutatorDefinition = {
  id: 'inspiration',
  hooks: {
    turnEnd: (ctx, owner) => {
      const { state } = ctx;
      if (state.currentPlayer !== owner || state.players[owner].passed) return;
      const units = COMBAT_ROWS.flatMap((row) => state.players[owner].rows[row].units).filter(
        (id) => isRegularUnit(defOf(state, id)),
      );
      if (units.length === 0) return;
      const target = units[ctx.random('game').int(units.length)]!;
      const card = state.cards[target]!;
      card.boost = (card.boost ?? 0) + 1;
      ctx.emit({
        type: 'MUTATOR_TRIGGERED',
        mutator: 'inspiration',
        player: owner,
        cardId: target,
      });
    },
  },
};

/** Weather is not cleared at the end of a round: it carries over to the next one. */
const lingeringWeather: MutatorDefinition = {
  id: 'lingeringWeather',
  hooks: {
    // Hooks run once per player; marking twice is harmless.
    roundEnd: (ctx) => {
      for (const id of ctx.state.weather) ctx.state.cards[id]!.noRemove = true;
    },
    roundStart: (ctx) => {
      for (const id of ctx.state.weather) delete ctx.state.cards[id]?.noRemove;
    },
  },
};

export const builtinMutators: MutatorDefinition[] = [
  fullHands,
  noLeaders,
  inspiration,
  lingeringWeather,
];
