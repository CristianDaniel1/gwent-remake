import { getCardDef } from '../data/catalog';
import type { AbilityId, CombatRow } from '../model/card';
import {
  cardDefId,
  cardInstanceId,
  opponentOf,
  type CardInstanceId,
  type PlayerId,
} from '../model/ids';
import type { GameState } from '../model/state';
import type { MoveReason, Zone } from '../model/zones';
import { getAbility } from '../mechanics/registry';
import type { EngineContext } from '../mechanics/types';
import type { RandomSource } from './rng';
import {
  defOf,
  insertIntoZone,
  instanceOf,
  locate,
  removeFromZone,
  type InsertPosition,
} from './zones';

/** Creates a new card (token, transformation). It starts outside any zone. */
export function spawnCard(
  state: GameState,
  defId: number,
  owner: PlayerId,
  options: { token?: boolean } = {},
): CardInstanceId {
  getCardDef(cardDefId(defId));
  const id = cardInstanceId(`c${state.nextInstanceId++}`);
  state.cards[id] = {
    id,
    defId: cardDefId(defId),
    owner,
    ...(options.token ? { isToken: true as const } : {}),
  };
  return id;
}

/** Schedules the effects of leaving the row (e.g. Avenger). */
function triggerLeave(ctx: EngineContext, id: CardInstanceId, from: Zone) {
  if (from.kind !== 'row') return;
  for (const ability of defOf(ctx.state, id).abilities) {
    if (getAbility(ability)?.onLeave) {
      ctx.schedule({
        type: 'TRIGGER',
        event: 'leave',
        ability,
        cardId: id,
        side: from.side,
        row: from.row,
      });
    }
  }
}

export interface MoveOptions {
  position?: InsertPosition;
  /** Origin zone, when already known (avoids searching every zone for the card). */
  from?: Zone;
  /** Triggers leave effects when leaving a row (default: yes). */
  triggerLeave?: boolean;
}

/**
 * Moves a card from wherever it is to `to` and emits CARD_MOVED.
 * "hand/grave/deck" destinations belong to the card's current owner when `to` comes from `zoneOf`.
 * Tokens that would go to the grave cease to exist.
 */
export function moveCard(
  ctx: EngineContext,
  id: CardInstanceId,
  to: Zone,
  reason: MoveReason,
  options: MoveOptions = {},
): Zone {
  const { state } = ctx;
  const from = options.from ?? locate(state, id) ?? ({ kind: 'void' } as const);
  removeFromZone(state, from, id);
  // Bonuses only last while the card stays in its row
  if (from.kind === 'row' && state.cards[id]?.boost) delete state.cards[id].boost;

  const vanish = to.kind === 'void' || (to.kind === 'grave' && instanceOf(state, id).isToken);
  const target: Zone = vanish ? { kind: 'void' } : to;
  if (!vanish) insertIntoZone(state, target, id, options.position);
  ctx.emit({ type: 'CARD_MOVED', cardId: id, from, to: target, reason });

  if (options.triggerLeave ?? true) triggerLeave(ctx, id, from);
  if (vanish) delete state.cards[id];
  return from;
}

/** Grave, hand or deck of the card's current owner. */
export function ownZone(
  state: GameState,
  id: CardInstanceId,
  kind: 'grave' | 'hand' | 'deck',
): Zone {
  return { kind, player: instanceOf(state, id).owner };
}

export function sendToGrave(ctx: EngineContext, id: CardInstanceId, reason: MoveReason): void {
  moveCard(ctx, id, ownZone(ctx.state, id, 'grave'), reason);
}

/** Draws up to `count` cards from the top of the deck. Returns the drawn ones. */
export function drawCards(ctx: EngineContext, player: PlayerId, count: number): CardInstanceId[] {
  const drawn: CardInstanceId[] = [];
  for (let i = 0; i < count; i++) {
    const top = ctx.state.players[player].deck[0];
    if (!top) break;
    moveCard(ctx, top, { kind: 'hand', player }, 'draw', { from: { kind: 'deck', player } });
    drawn.push(top);
  }
  return drawn;
}

/** Side where the card lands when played: its owner's, or the opponent's for spies. */
export function naturalSide(state: GameState, id: CardInstanceId): PlayerId {
  const owner = instanceOf(state, id).owner;
  const toOpponent = defOf(state, id).abilities.some((a) => getAbility(a)?.playsOnOpponentSide);
  return toOpponent ? opponentOf(owner) : owner;
}

export interface PlaceNowOptions {
  slot?: 'units' | 'special';
  from?: Zone;
  reason: MoveReason;
  suppress?: readonly AbilityId[];
}

/** Puts the card in the row now and schedules its placement effects. */
export function placeNow(
  ctx: EngineContext,
  id: CardInstanceId,
  side: PlayerId,
  row: CombatRow,
  { slot = 'units', reason, suppress = [], from }: PlaceNowOptions,
): void {
  const to: Zone = slot === 'special' ? { kind: 'special', side, row } : { kind: 'row', side, row };
  moveCard(ctx, id, to, reason, { triggerLeave: false, ...(from ? { from } : {}) });
  for (const ability of defOf(ctx.state, id).abilities) {
    if (suppress.includes(ability) || !getAbility(ability)?.onPlace) continue;
    ctx.schedule({ type: 'TRIGGER', event: 'place', ability, cardId: id, side, row });
  }
}

export interface PlaceCardOptions {
  reason: MoveReason;
  suppress?: AbilityId[];
  /** Row already decided (otherwise: the card's own row; agile asks the owner). */
  row?: CombatRow;
}

/**
 * Schedules placing a unit in its row from wherever it is
 * (deck, hand, grave). Agile units ask their owner to choose the row.
 */
export function placeCard(ctx: EngineContext, id: CardInstanceId, options: PlaceCardOptions): void {
  const { state } = ctx;
  const def = defOf(state, id);
  if (def.row === null) throw new Error(`placeCard: ${def.name} is not a unit`);
  const row = options.row ?? (def.row === 'agile' ? null : def.row);

  if (row === null) {
    ctx.requestChoice({
      player: instanceOf(state, id).owner,
      kind: 'agileRow',
      sourceCardId: id,
      options: [
        { id: 'close', row: 'close' },
        { id: 'ranged', row: 'ranged' },
      ],
      min: 1,
      max: 1,
      resume: {
        ref: { kind: 'core', id: 'placement' },
        name: 'agileRow',
        data: { cardId: id, reason: options.reason, suppress: options.suppress ?? [] },
      },
    });
    return;
  }

  const from = locate(state, id);
  if (!from) throw new Error(`placeCard: card ${id} is outside every zone`);
  ctx.schedule({
    type: 'PLACE',
    cardId: id,
    side: naturalSide(state, id),
    row,
    slot: 'units',
    from,
    reason: options.reason,
    ...(options.suppress?.length ? { suppress: options.suppress } : {}),
  });
}

/**
 * Appends and swaps with a random position, so the same seed always produces the same order.
 */
export function insertRandom(list: CardInstanceId[], id: CardInstanceId, rng: RandomSource): void {
  list.push(id);
  const index = rng.int(list.length);
  const last = list.length - 1;
  if (index !== last) [list[last], list[index]] = [list[index] as CardInstanceId, id];
}

/** Returns the card to the player's deck at a random position (the player's shuffle stream). */
export function shuffleIntoDeck(ctx: EngineContext, id: CardInstanceId, player: PlayerId): void {
  const { state } = ctx;
  const from = locate(state, id) ?? ({ kind: 'void' } as const);
  removeFromZone(state, from, id);
  // Bonuses only last while the card stays in its row
  if (from.kind === 'row' && state.cards[id]?.boost) delete state.cards[id].boost;
  insertRandom(
    state.players[player].deck,
    id,
    ctx.random(player === 'p1' ? 'deckHost' : 'deckGuest'),
  );
  ctx.emit({
    type: 'CARD_MOVED',
    cardId: id,
    from,
    to: { kind: 'deck', player },
    reason: 'shuffle',
  });
}
