import type { PlayerId } from '../../model/ids';
import type { FactionDefinition } from '../types';

/** Decides who starts the match (instead of the coin flip). */
export const scoiatael: FactionDefinition = {
  id: 'scoiatael',
  hooks: {
    gameStart: (ctx, owner) =>
      ctx.requestChoice({
        player: owner,
        kind: 'firstPlayer',
        options: [
          { id: 'p1', player: 'p1' },
          { id: 'p2', player: 'p2' },
        ],
        min: 1,
        max: 1,
        resume: { ref: { kind: 'faction', id: 'scoiatael' }, name: 'firstPlayer', data: { owner } },
      }),
  },
  choices: {
    firstPlayer: (ctx, [chosen], data) => {
      const chooser = data.owner as PlayerId;
      const firstPlayer = chosen as PlayerId;
      ctx.state.firstPlayer = firstPlayer;
      ctx.emit({ type: 'FIRST_PLAYER_CHOSEN', chooser, firstPlayer });
      ctx.emit({ type: 'FACTION_ABILITY', faction: 'scoiatael', player: chooser });
    },
  },
};
