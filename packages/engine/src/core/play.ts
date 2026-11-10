import type { CardDef, CombatRow } from '../model/card';
import type { CardInstanceId, PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { getAbility } from '../mechanics/registry';
import type { EngineContext, PlayOption, SpecialPlay } from '../mechanics/types';
import { naturalSide } from './board';
import { defOf } from './zones';

/** Rows printed on the unit (agile: two options). */
export function unitRows(def: CardDef): CombatRow[] {
  if (def.type !== 'unit' || def.row === null) return [];
  return def.row === 'agile' ? ['close', 'ranged'] : [def.row];
}

/** Play rule for a non-unit card: the one from the first ability that defines it. */
function specialPlayOf(def: CardDef): SpecialPlay | undefined {
  for (const ability of def.abilities) {
    const play = getAbility(ability)?.play;
    if (play) return play;
  }
  return undefined;
}

/** Valid ways to play the card now. Empty = it cannot be played. */
export function playOptions(
  state: GameState,
  player: PlayerId,
  cardId: CardInstanceId,
): PlayOption[] {
  const def = defOf(state, cardId);
  if (def.type === 'unit') return unitRows(def).map((row) => ({ row }));
  return specialPlayOf(def)?.options(state, player, cardId) ?? [];
}

/** Resolves the play (validation already happened). The card is still in the hand. */
export function resolvePlay(
  ctx: EngineContext,
  player: PlayerId,
  cardId: CardInstanceId,
  option: PlayOption,
): void {
  const def = defOf(ctx.state, cardId);
  if (def.type === 'unit') {
    if (!option.row) throw new Error('Unit played without a row');
    ctx.schedule({
      type: 'PLACE',
      cardId,
      side: naturalSide(ctx.state, cardId),
      row: option.row,
      slot: 'units',
      from: { kind: 'hand', player },
      reason: 'play',
    });
    return;
  }
  const play = specialPlayOf(def);
  if (!play) throw new Error(`Card without a play rule: ${def.name}`);
  play.resolve(ctx, player, cardId, option);
}
