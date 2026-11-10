import { defOf, type CombatRow, type GameState } from '@gwent/engine';

export type WeatherKind = 'frost' | 'fog' | 'rain';

const WEATHER_ROW: Record<WeatherKind, CombatRow> = {
  frost: 'close',
  fog: 'ranged',
  rain: 'siege',
};

/** Which weather covers each row (applies to both sides). */
export function weatherOverlays(state: GameState): Partial<Record<CombatRow, WeatherKind>> {
  const out: Partial<Record<CombatRow, WeatherKind>> = {};
  for (const id of state.weather) {
    for (const ability of defOf(state, id).abilities) {
      if (ability in WEATHER_ROW) out[WEATHER_ROW[ability as WeatherKind]] = ability as WeatherKind;
    }
  }
  return out;
}
