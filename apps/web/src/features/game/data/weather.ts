import type { CombatRow } from '@gwent/engine';
import type { WeatherKind } from '../interfaces/board';

/** Row each weather kind covers. */
export const WEATHER_ROW: Record<WeatherKind, CombatRow> = {
  frost: 'close',
  fog: 'ranged',
  rain: 'siege',
};
