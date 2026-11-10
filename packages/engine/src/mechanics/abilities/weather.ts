import { moveCard, sendToGrave } from '../../core/board';
import { defOf, instanceOf } from '../../core/zones';
import type { CombatRow } from '../../model/card';
import { PLAYER_IDS, type CardInstanceId } from '../../model/ids';
import type { GameState } from '../../model/state';
import {
  POWER_STAGE,
  type AbilityDefinition,
  type EngineContext,
  type SpecialPlay,
} from '../types';

/** Strength under weather: 1, or half (minimum 1) for King Bran's side. Never increases. */
function weatheredPower(power: number, halfWeather: boolean): number {
  const floor = halfWeather ? Math.max(1, Math.floor(power / 2)) : 1;
  return Math.min(floor, power);
}

/** Removes all weather from the board (to the owners' graves). */
export function clearWeather(ctx: EngineContext): void {
  for (const id of [...ctx.state.weather].reverse()) sendToGrave(ctx, id, 'discard');
}

/**
 * Plays a weather card (from the hand or the deck). Clear Weather clears everything; weather
 * identical to an active one goes straight to the grave with no extra effect.
 */
export function playWeather(ctx: EngineContext, cardId: CardInstanceId): void {
  const { state } = ctx;
  const def = defOf(state, cardId);
  const duplicate = state.weather.some((id) => defOf(state, id).name === def.name);
  ctx.emit({
    type: 'ABILITY_TRIGGERED',
    ability: def.abilities[0] ?? 'weather',
    player: instanceOf(state, cardId).owner,
    cardId,
  });
  moveCard(ctx, cardId, { kind: 'weather' }, 'play');
  if (def.abilities.includes('clear')) clearWeather(ctx);
  else if (duplicate) sendToGrave(ctx, cardId, 'discard');
}

const weatherPlay: SpecialPlay = {
  options: () => [{}],
  resolve: (ctx, _player, cardId) => playWeather(ctx, cardId),
};

/** Weather that affects one row on both sides. */
function rowWeather(id: string, row: CombatRow): AbilityDefinition {
  return {
    id,
    play: weatherPlay,
    modifiers: (_source, location, state: GameState) =>
      location !== 'weather'
        ? []
        : PLAYER_IDS.map((side) => ({
            side,
            row,
            modifier: {
              stage: POWER_STAGE.weather,
              key: 'weather',
              apply: (power: number) => weatheredPower(power, state.players[side].halfWeather),
            },
          })),
  };
}

export const frost = rowWeather('frost', 'close');
export const fog = rowWeather('fog', 'ranged');
export const rain = rowWeather('rain', 'siege');

/** Skellige Storm: the card also has "rain" and "fog", which bring the effects. */
export const storm: AbilityDefinition = { id: 'storm', play: weatherPlay };

export const clear: AbilityDefinition = { id: 'clear', play: weatherPlay };

export const weatherAbilities = [frost, fog, rain, storm, clear];
