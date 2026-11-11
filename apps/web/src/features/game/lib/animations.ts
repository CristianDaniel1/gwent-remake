import {
  defOf,
  locate,
  PLAYER_IDS,
  type CardInstanceId,
  type GameEvent,
  type GameState,
  type PlayerId,
  type Zone,
} from '@gwent/engine';
import type { AbilityAnimation, Flight, MoveAnimations } from '../interfaces/animations';
import type { AbilityTriggeredEvent } from '../interfaces/events';
import type { CardMovedEvent } from '../interfaces/events';
import { CARD_ANIMATIONS, ENTERS_BOARD } from '../data/animations';

/**
 * Finds the card the opponent just played or the leader it used.
 *
 * @param events - Events of the move.
 * @param human - Human player.
 * @param state - State after the move.
 * @returns The card id, or null.
 */
export const opponentReveal = (
  events: readonly GameEvent[],
  human: PlayerId,
  state: GameState,
): CardInstanceId | null => {
  for (const event of events) {
    const played = event.type === 'CARD_PLAYED' || event.type === 'LEADER_ACTIVATED';
    if (played && event.player !== human && state.cards[event.cardId]) return event.cardId;
  }
  return null;
};

/**
 * Finds the units destroyed on the board.
 *
 * @param events - Events of the move.
 * @returns The destroyed card ids.
 */
export const burnedCards = (events: readonly GameEvent[]): CardInstanceId[] =>
  events.flatMap((event) =>
    event.type === 'CARD_MOVED' && event.reason === 'destroy' && event.from.kind === 'row'
      ? [event.cardId]
      : [],
  );

/**
 * Checks whether there is any animation to play.
 *
 * @param animations - Animations of a move.
 * @returns True when at least one animation exists.
 */
export const hasAnimations = ({ cards, rows, heroes }: MoveAnimations): boolean =>
  !!rows.length || !!heroes.length || !!Object.keys(cards).length;

const isHeroEntering = (event: CardMovedEvent, state: GameState) =>
  event.to.kind === 'row' &&
  ENTERS_BOARD.has(event.reason) &&
  !!state.cards[event.cardId] &&
  defOf(state, event.cardId).hero;

const addAbility = (animations: MoveAnimations, event: AbilityTriggeredEvent, state: GameState) => {
  if (!event.cardId || !state.cards[event.cardId]) return;
  const zone = locate(state, event.cardId);

  if (event.ability === 'horn') {
    if (zone?.kind !== 'row' && zone?.kind !== 'special') return;
    const { side, row } = zone;
    if (
      !animations.rows.some(
        (rowAnimation) => rowAnimation.side === side && rowAnimation.row === row,
      )
    )
      animations.rows.push({ side, row, anim: 'horn' });
    return;
  }
  if (event.ability === 'bond') {
    if (zone?.kind !== 'row') return;
    const name = defOf(state, event.cardId).name;
    for (const id of state.players[zone.side].rows[zone.row].units)
      if (defOf(state, id).name === name) animations.cards[id] = 'bond';
    return;
  }
  if (CARD_ANIMATIONS.has(event.ability))
    animations.cards[event.cardId] = event.ability as AbilityAnimation;
};

/**
 * Collects the card, row and hero animations of a move.
 *
 * @param events - Events of the move.
 * @param state - State after the move.
 * @returns The animations to play.
 */
export const animationsFrom = (events: readonly GameEvent[], state: GameState): MoveAnimations => {
  const animations: MoveAnimations = { cards: {}, rows: [], heroes: [] };
  for (const event of events) {
    if (event.type === 'CARD_MOVED' && isHeroEntering(event, state))
      animations.heroes.push(event.cardId);
    else if (event.type === 'MUTATOR_TRIGGERED' && event.mutator === 'inspiration' && event.cardId)
      animations.cards[event.cardId] = 'morale';
    else if (event.type === 'ABILITY_TRIGGERED') addAbility(animations, event, state);
  }
  return animations;
};

const zoneShows = (state: GameState, zone: Zone, id: CardInstanceId, human: PlayerId): boolean => {
  switch (zone.kind) {
    case 'deck':
    case 'void':
      return false;
    case 'hand':
      return zone.player === human;
    case 'grave':
      return state.players[zone.player].grave.at(-1) === id;
    default:
      return true;
  }
};

const isShown = (state: GameState, id: CardInstanceId, human: PlayerId): boolean => {
  const zone = locate(state, id);
  if (!zone) return PLAYER_IDS.some((player) => state.players[player].leader === id);
  return zoneShows(state, zone, id, human);
};

const isPile = (zone: Zone, human: PlayerId) =>
  zone.kind === 'deck' || zone.kind === 'grave' || (zone.kind === 'hand' && zone.player !== human);

/**
 * Finds the cards that leave a hidden pile and become visible.
 *
 * @param events - Events of the move.
 * @param before - State on screen.
 * @param after - State after the move.
 * @param human - Human player.
 * @param except - Card already shown another way, if any.
 * @returns The flights from the piles.
 */
export const arrivals = (
  events: readonly GameEvent[],
  before: GameState,
  after: GameState,
  human: PlayerId,
  except: CardInstanceId | null,
): Flight[] => {
  const flights: Flight[] = [];
  for (const event of events) {
    if (event.type !== 'CARD_MOVED' || event.cardId === except || !after.cards[event.cardId])
      continue;
    if (flights.some((flight) => flight.cardId === event.cardId)) continue;
    if (!isPile(event.from, human) || zoneShows(before, event.from, event.cardId, human)) continue;
    if (isShown(after, event.cardId, human))
      flights.push({ cardId: event.cardId, zone: event.from });
  }
  return flights;
};

/**
 * Finds the visible cards that end up hidden in a pile.
 *
 * @param events - Events of the move.
 * @param after - State after the move.
 * @param human - Human player.
 * @returns The flights to the piles.
 */
export const departures = (
  events: readonly GameEvent[],
  after: GameState,
  human: PlayerId,
): Flight[] => {
  const lastMove = new Map<CardInstanceId, CardMovedEvent>();
  for (const event of events) if (event.type === 'CARD_MOVED') lastMove.set(event.cardId, event);

  const flights: Flight[] = [];
  for (const [id, move] of lastMove) {
    if (!after.cards[id] || !isPile(move.to, human) || isShown(after, id, human)) continue;
    const wasVisible = !isPile(move.from, human) && move.from.kind !== 'void';
    if (wasVisible) flights.push({ cardId: id, zone: move.to });
  }
  return flights;
};
