import { defOf, isRegularUnit } from '../../core/zones';
import { COMBAT_ROWS } from '../../model/card';
import type { PlayerId } from '../../model/ids';
import type { GameState } from '../../model/state';
import type { FactionDefinition } from '../types';

const unitsOnSide = (state: GameState, owner: PlayerId) =>
  COMBAT_ROWS.flatMap((row) => state.players[owner].rows[row].units);

/** A random unit on its own side stays on the board for the next round. */
export const monsters: FactionDefinition = {
  id: 'monsters',
  hooks: {
    roundEnd: (ctx, owner) => {
      const { state } = ctx;
      const units = unitsOnSide(state, owner).filter((id) => isRegularUnit(defOf(state, id)));
      if (units.length === 0) return;
      const kept = units[ctx.random('game').int(units.length)];
      const card = kept && state.cards[kept];
      if (card) card.noRemove = true;
    },
    roundStart: (ctx, owner) => {
      const { state } = ctx;
      const kept = unitsOnSide(state, owner).filter((id) => state.cards[id]?.noRemove);
      if (kept.length === 0) return;
      for (const id of kept) delete state.cards[id]?.noRemove;
      ctx.emit({ type: 'FACTION_ABILITY', faction: 'monsters', player: owner });
    },
  },
};
