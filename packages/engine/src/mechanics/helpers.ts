import { instanceOf } from '../core/zones';
import type { BoardPosition, EngineContext } from './types';

/** Emits ABILITY_TRIGGERED for the card (sound/animation in the UI). */
export function announce(
  ctx: EngineContext,
  ability: string,
  { cardId }: Pick<BoardPosition, 'cardId'>,
) {
  ctx.emit({
    type: 'ABILITY_TRIGGERED',
    ability,
    player: instanceOf(ctx.state, cardId).owner,
    cardId,
  });
}

/** onPlace that only announces the ability (passive effect already handled in scoring). */
export const announceOnPlace = (ability: string) => (ctx: EngineContext, position: BoardPosition) =>
  announce(ctx, ability, position);
