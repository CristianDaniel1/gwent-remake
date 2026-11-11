import type { GameEvent, GameState, PlayerId } from '@gwent/engine';
import { arrivals, burnedCards, departures, opponentReveal } from './animations';
import { LANDING_MS } from '../constants/timings';
import { ABILITY_ANIMATION_MS } from '../constants/timings';
import type { MovePlan } from '../interfaces/move-plan';
import { STILL_MOVE_PLAN } from '../data/move-plan';

/**
 * Plans what to show before and after a move is applied.
 *
 * @param events - Events of the move.
 * @param before - State on screen.
 * @param after - State after the move.
 * @param human - Human player.
 * @param reducedMotion - Whether motion should be skipped.
 * @returns The spotlight, burned cards and flights.
 */
export const planMove = (
  events: readonly GameEvent[],
  before: GameState,
  after: GameState,
  human: PlayerId,
  reducedMotion: boolean,
): MovePlan => {
  if (reducedMotion) return STILL_MOVE_PLAN;
  const spotlight = opponentReveal(events, human, after);
  return {
    spotlight,
    burned: burnedCards(events),
    takeoff: arrivals(events, before, after, human, spotlight),
    leaving: departures(events, after, human),
  };
};

/**
 * Computes how long the turn notices wait for a played card to land.
 *
 * @param events - Events of the move.
 * @param animated - Whether the move has ability animations.
 * @param reducedMotion - Whether motion should be skipped.
 * @returns The delay in milliseconds.
 */
export const settleDelay = (
  events: readonly GameEvent[],
  animated: boolean,
  reducedMotion: boolean,
): number => {
  const played = events.some(
    (event) => event.type === 'CARD_PLAYED' || event.type === 'LEADER_ACTIVATED',
  );
  if (!played || reducedMotion) return 0;
  return LANDING_MS + (animated ? ABILITY_ANIMATION_MS : 0);
};
