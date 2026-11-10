import { placeCard } from '../../core/board';
import type { PlayerId } from '../../model/ids';
import { graveUnits } from '../abilities/unit-effects';
import type { FactionDefinition } from '../types';

const REVIVED_UNITS = 2;

/** At the start of round 3, 2 random units from the grave return to the board. */
export const skellige: FactionDefinition = {
  id: 'skellige',
  hooks: {
    roundStart: (ctx, owner) => {
      if (ctx.state.round !== 3) return;
      ctx.emit({ type: 'FACTION_ABILITY', faction: 'skellige', player: owner });
      // One at a time: a revived unit (e.g. a medic) may change the grave.
      for (let i = 0; i < REVIVED_UNITS; i++) {
        ctx.schedule({
          type: 'MECHANIC',
          ref: { kind: 'faction', id: 'skellige' },
          name: 'revive',
          data: { owner },
        });
      }
    },
  },
  tasks: {
    revive: (ctx, data) => {
      const units = graveUnits(ctx.state, data.owner as PlayerId);
      const pick = units[ctx.random('game').int(units.length)];
      if (pick) placeCard(ctx, pick, { reason: 'revive' });
    },
  },
};
