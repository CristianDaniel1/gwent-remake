import {
  defOf,
  locate,
  PLAYER_IDS,
  type CardInstanceId,
  type CombatRow,
  type GameEvent,
  type GameState,
  type PlayerId,
  type Zone,
} from '@gwent/engine';

/** Ability animations with their own image (`anim_<name>.png`). */
export type AbilityAnimation = 'bond' | 'horn' | 'medic' | 'morale' | 'muster' | 'spy';

export interface RowAnimation {
  side: PlayerId;
  row: CombatRow;
  anim: AbilityAnimation;
}

export interface MoveAnimations {
  /** Icon shown over a card (medic, morale, spy…). */
  cards: Partial<Record<CardInstanceId, AbilityAnimation>>;
  /** Icon and light over a whole row (Commander's Horn). */
  rows: RowAnimation[];
  /** Heroes that just entered the board: a burst of flames. */
  heroes: CardInstanceId[];
}

const ENTERS_BOARD = new Set(['play', 'muster', 'revive', 'summon']);

const CARD_ANIMS = new Set<string>(['medic', 'morale', 'muster', 'spy']);

/** Card the opponent of `human` just put into play (or leader used): shown large first. */
export function opponentReveal(
  events: readonly GameEvent[],
  human: PlayerId,
  state: GameState,
): CardInstanceId | null {
  for (const e of events) {
    if (
      (e.type === 'CARD_PLAYED' || e.type === 'LEADER_ACTIVATED') &&
      e.player !== human &&
      state.cards[e.cardId]
    )
      return e.cardId;
  }
  return null;
}

/** Units destroyed on the board (Scorch): they burn before leaving. */
export function burnedCards(events: readonly GameEvent[]): CardInstanceId[] {
  return events.flatMap((e) =>
    e.type === 'CARD_MOVED' && e.reason === 'destroy' && e.from.kind === 'row' ? [e.cardId] : [],
  );
}

/** Ability animations of a batch of events. `state` is the state after the events. */
export function animationsFrom(events: readonly GameEvent[], state: GameState): MoveAnimations {
  const animations: MoveAnimations = { cards: {}, rows: [], heroes: [] };
  for (const e of events) {
    if (e.type === 'CARD_MOVED') {
      if (
        e.to.kind === 'row' &&
        ENTERS_BOARD.has(e.reason) &&
        state.cards[e.cardId] &&
        defOf(state, e.cardId).hero
      )
        animations.heroes.push(e.cardId);
      continue;
    }
    if (e.type === 'MUTATOR_TRIGGERED' && e.mutator === 'inspiration' && e.cardId) {
      animations.cards[e.cardId] = 'morale';
      continue;
    }
    if (e.type !== 'ABILITY_TRIGGERED' || !e.cardId || !state.cards[e.cardId]) continue;
    const zone = locate(state, e.cardId);
    if (e.ability === 'horn') {
      if (zone && (zone.kind === 'row' || zone.kind === 'special')) {
        const { side, row } = zone;
        if (!animations.rows.some((r) => r.side === side && r.row === row))
          animations.rows.push({ side, row, anim: 'horn' });
      }
    } else if (e.ability === 'bond') {
      // The whole group lights up, not only the card that completed it
      if (zone?.kind !== 'row') continue;
      const name = defOf(state, e.cardId).name;
      for (const id of state.players[zone.side].rows[zone.row].units)
        if (defOf(state, id).name === name) animations.cards[id] = 'bond';
    } else if (CARD_ANIMS.has(e.ability)) {
      animations.cards[e.cardId] = e.ability as AbilityAnimation;
    }
  }
  return animations;
}

/** A card drawn for a moment over a pile (deck, grave, opponent's hand), so it can fly from/to there. */
export interface Flight {
  cardId: CardInstanceId;
  zone: Zone;
}

/**
 * Is the card drawn somewhere on the board for `human`? Then Motion already moves it by its
 * layoutId; otherwise (deck, buried in the grave, opponent's hand) it needs a flight.
 */
export function isShown(state: GameState, id: CardInstanceId, human: PlayerId): boolean {
  const zone = locate(state, id);
  if (!zone) return PLAYER_IDS.some((p) => state.players[p].leader === id);
  return zoneShows(state, zone, id, human);
}

function zoneShows(state: GameState, zone: Zone, id: CardInstanceId, human: PlayerId): boolean {
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
}

/** Piles a flight can start from or end at. */
const pileZone = (zone: Zone, human: PlayerId) =>
  zone.kind === 'deck' || zone.kind === 'grave' || (zone.kind === 'hand' && zone.player !== human);

/**
 * Cards that come out of a pile and land somewhere visible (Medic from the grave, Muster from
 * the deck, drawing…). They are drawn over the pile first, then fly to their place.
 * `before` is the state on screen; `except` is a card shown some other way (the spotlight).
 */
export function arrivals(
  events: readonly GameEvent[],
  before: GameState,
  after: GameState,
  human: PlayerId,
  except: CardInstanceId | null,
): Flight[] {
  const out: Flight[] = [];
  for (const e of events) {
    if (e.type !== 'CARD_MOVED' || e.cardId === except || !after.cards[e.cardId]) continue;
    if (out.some((f) => f.cardId === e.cardId)) continue;
    if (!pileZone(e.from, human) || zoneShows(before, e.from, e.cardId, human)) continue;
    if (isShown(after, e.cardId, human)) out.push({ cardId: e.cardId, zone: e.from });
  }
  return out;
}

/**
 * Cards that leave the board into a pile where they are no longer drawn (buried in the grave,
 * back in the deck, to the opponent's hand). They fly to the pile and disappear there.
 */
export function departures(
  events: readonly GameEvent[],
  after: GameState,
  human: PlayerId,
): Flight[] {
  const last = new Map<CardInstanceId, Extract<GameEvent, { type: 'CARD_MOVED' }>>();
  for (const e of events) if (e.type === 'CARD_MOVED') last.set(e.cardId, e);
  const out: Flight[] = [];
  for (const [id, e] of last) {
    if (!after.cards[id] || !pileZone(e.to, human) || isShown(after, id, human)) continue;
    // Only cards that were visible before (a row, the weather, the human's hand…)
    const fromVisible = !pileZone(e.from, human) && e.from.kind !== 'void';
    if (fromVisible) out.push({ cardId: id, zone: e.to });
  }
  return out;
}
