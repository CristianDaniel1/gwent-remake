import { placeCard } from '../core/board';
import type { AbilityId, CombatRow } from '../model/card';
import type { CardInstanceId } from '../model/ids';
import type { MoveReason } from '../model/zones';
import type { CoreMechanic } from './types';

/** Continuation of placeCard when the owner chooses the row of an agile unit. */
export const placement: CoreMechanic = {
  id: 'placement',
  choices: {
    agileRow: (ctx, [row], data) => {
      if (!row) return;
      placeCard(ctx, data.cardId as CardInstanceId, {
        reason: data.reason as MoveReason,
        suppress: data.suppress as AbilityId[],
        row: row as CombatRow,
      });
    },
  },
};
