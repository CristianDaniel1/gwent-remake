import { drawCards } from '../../core/board';
import type { FactionDefinition } from '../types';

/** Draws a card when a round starts after winning the previous one. */
export const realms: FactionDefinition = {
  id: 'realms',
  hooks: {
    roundStart: (ctx, owner) => {
      const { state } = ctx;
      const previous = state.roundHistory[state.round - 2];
      if (state.round < 2 || previous?.winner !== owner || state.players[owner].deck.length === 0) {
        return;
      }
      drawCards(ctx, owner, 1);
      ctx.emit({ type: 'FACTION_ABILITY', faction: 'realms', player: owner });
    },
  },
};
