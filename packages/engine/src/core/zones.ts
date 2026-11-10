import { getCardDef } from '../data/catalog';
import { COMBAT_ROWS, type CardDef, type CardInstance } from '../model/card';
import { PLAYER_IDS, type CardInstanceId } from '../model/ids';
import type { GameState } from '../model/state';
import type { Zone } from '../model/zones';

export function instanceOf(state: GameState, id: CardInstanceId): CardInstance {
  const card = state.cards[id];
  if (!card) throw new Error(`Unknown card instance: ${id}`);
  return card;
}

export function defOf(state: GameState, id: CardInstanceId): CardDef {
  return getCardDef(instanceOf(state, id).defId);
}

/** Regular unit: not a hero, special or weather. Target of Scorch, Decoy and Medic. */
export function isRegularUnit(def: CardDef): boolean {
  return def.type === 'unit' && !def.hero;
}

export function hasAbility(state: GameState, id: CardInstanceId, ability: string): boolean {
  return defOf(state, id).abilities.includes(ability);
}

/** Ids a zone holds (the special slot becomes a list of 0 or 1). */
function listOf(state: GameState, zone: Zone): CardInstanceId[] | null {
  switch (zone.kind) {
    case 'deck':
    case 'hand':
    case 'grave':
      return state.players[zone.player][zone.kind];
    case 'row':
      return state.players[zone.side].rows[zone.row].units;
    case 'weather':
      return state.weather;
    case 'special':
    case 'void':
      return null;
  }
}

/** Is the card in this zone? (much cheaper than `locate` when the zone is already known). */
export function isInZone(state: GameState, zone: Zone, id: CardInstanceId): boolean {
  if (zone.kind === 'special') return state.players[zone.side].rows[zone.row].special === id;
  return listOf(state, zone)?.includes(id) ?? false;
}

/** Where the card is now (the leader is in no zone: returns null). */
export function locate(state: GameState, id: CardInstanceId): Zone | null {
  for (const player of PLAYER_IDS) {
    const me = state.players[player];
    if (me.hand.includes(id)) return { kind: 'hand', player };
    if (me.deck.includes(id)) return { kind: 'deck', player };
    if (me.grave.includes(id)) return { kind: 'grave', player };
    for (const row of COMBAT_ROWS) {
      if (me.rows[row].units.includes(id)) return { kind: 'row', side: player, row };
      if (me.rows[row].special === id) return { kind: 'special', side: player, row };
    }
  }
  if (state.weather.includes(id)) return { kind: 'weather' };
  return null;
}

export function removeFromZone(state: GameState, zone: Zone, id: CardInstanceId): boolean {
  if (zone.kind === 'special') {
    const row = state.players[zone.side].rows[zone.row];
    if (row.special !== id) return false;
    row.special = null;
    return true;
  }
  const list = listOf(state, zone);
  if (!list) return false;
  const index = list.indexOf(id);
  if (index < 0) return false;
  list.splice(index, 1);
  return true;
}

export type InsertPosition = 'top' | 'bottom' | { index: number };

export function insertIntoZone(
  state: GameState,
  zone: Zone,
  id: CardInstanceId,
  position: InsertPosition = 'bottom',
): void {
  if (zone.kind === 'special') {
    state.players[zone.side].rows[zone.row].special = id;
    return;
  }
  const list = listOf(state, zone);
  if (!list) return;
  if (position === 'top') list.unshift(id);
  else if (position === 'bottom') list.push(id);
  else list.splice(Math.min(position.index, list.length), 0, id);
}

/** Every card (units and specials) on a player's side, in canonical order. */
export function cardsOnSide(state: GameState, side: (typeof PLAYER_IDS)[number]): CardInstanceId[] {
  return COMBAT_ROWS.flatMap((row) => {
    const { units, special } = state.players[side].rows[row];
    return special ? [...units, special] : units;
  });
}
