import { defOf, type CombatRow, type GameState, type PlayerId } from '@gwent/engine';
import type { WeatherKind } from '../interfaces/board';
import { WEATHER_ROW } from '../data/weather';

/**
 * Finds the weather covering each row.
 *
 * @param state - Game state.
 * @returns The weather kind by row.
 */
export const weatherOverlays = (state: GameState): Partial<Record<CombatRow, WeatherKind>> => {
  const overlays: Partial<Record<CombatRow, WeatherKind>> = {};
  for (const id of state.weather) {
    for (const ability of defOf(state, id).abilities) {
      if (ability in WEATHER_ROW)
        overlays[WEATHER_ROW[ability as WeatherKind]] = ability as WeatherKind;
    }
  }
  return overlays;
};

/**
 * Finds the player who must act now.
 *
 * @param state - Game state.
 * @returns The player, or null outside the playing phase.
 */
export const currentTurn = (state: GameState): PlayerId | null =>
  state.phase === 'playing' ? (state.pendingChoice?.player ?? state.currentPlayer) : null;
