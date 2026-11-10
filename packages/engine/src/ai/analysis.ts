// Board readings used by the bot weights.
import { computeBoard, type BoardScore, type CardPower } from '../core/scoring';
import { defOf, isRegularUnit } from '../core/zones';
import { COMBAT_ROWS, type CardDef, type CombatRow } from '../model/card';
import { opponentOf, type CardInstanceId, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import type { RandomSource } from '../core/rng';

/** Card order: specials, weather, then by strength and name. */
export function compareCards(a: CardDef, b: CardDef): number {
  const rank = (c: CardDef) => (c.faction === 'special' ? -2 : c.faction === 'weather' ? -1 : 0);
  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;
  const byPower = a.strength - b.strength;
  if (byPower !== 0) return byPower;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** Regular units with abilities the bot likes to reuse (Decoy, Medic). */
export interface CardCounts {
  spy: CardInstanceId[];
  medic: CardInstanceId[];
  scorch: CardInstanceId[];
}

export function countCards(state: GameState, ids: readonly CardInstanceId[]): CardCounts {
  const counts: CardCounts = { spy: [], medic: [], scorch: [] };
  for (const id of ids) {
    const def = defOf(state, id);
    if (!isRegularUnit(def)) continue;
    for (const ability of def.abilities) {
      if (ability === 'spy' || ability === 'medic') counts[ability].push(id);
      if (ability === 'scorch_c' || ability === 'scorch_r' || ability === 'scorch_s') {
        counts.scorch.push(id);
      }
    }
  }
  return counts;
}

/** Everything the bot looks at before deciding, computed once per turn. */
export interface Analysis {
  state: GameState;
  me: PlayerId;
  opp: PlayerId;
  board: BoardScore;
  /** Strongest regular units in each row. */
  rowMax: Record<PlayerId, Record<CombatRow, CardPower[]>>;
  /** Strongest regular units on each side (ties included). */
  strongest: Record<PlayerId, CardPower[]>;
  /** Cards on my side of the board and in the graves. */
  myField: CardCounts;
  graves: Record<PlayerId, CardCounts>;
}

export function analyze(state: GameState, me: PlayerId): Analysis {
  const opp = opponentOf(me);
  const board = computeBoard(state);
  const rowMax = { p1: {}, p2: {} } as Analysis['rowMax'];
  const strongest = { p1: [], p2: [] } as Analysis['strongest'];

  for (const side of [me, opp]) {
    for (const row of COMBAT_ROWS) {
      const units = board[side].rows[row].cards.filter((c) => isRegularUnit(defOf(state, c.id)));
      const max = Math.max(...units.map((c) => c.power));
      rowMax[side][row] = units.filter((c) => c.power === max);
    }
    const all = COMBAT_ROWS.flatMap((row) => rowMax[side][row]);
    const max = Math.max(...all.map((c) => c.power));
    strongest[side] = all.filter((c) => c.power === max);
  }

  const myField = countCards(
    state,
    COMBAT_ROWS.flatMap((row) => state.players[me].rows[row].units),
  );
  const graves = {
    [me]: countCards(state, state.players[me].grave),
    [opp]: countCards(state, state.players[opp].grave),
  } as Record<PlayerId, CardCounts>;

  return { state, me, opp, board, rowMax, strongest, myField, graves };
}

// --- Simulations ("what if") ---

type Mutation = (state: GameState) => GameState;

/** Point difference (my gain − opponent's gain) after a hypothetical change. */
export function netGain(state: GameState, me: PlayerId, mutate: Mutation): number {
  const before = computeBoard(state);
  const after = computeBoard(mutate(state));
  const opp = opponentOf(me);
  return after[me].total - before[me].total - (after[opp].total - before[opp].total);
}

/** Shallow copy of the state with the card in a row (the card also stays in its origin; scoring only reads rows). */
export function withCardInRow(
  side: PlayerId,
  row: CombatRow,
  cardId: CardInstanceId,
  slot: 'units' | 'special' = 'units',
): Mutation {
  return (state) => {
    const current = state.players[side].rows[row];
    const nextRow =
      slot === 'units'
        ? { ...current, units: [...current.units, cardId] }
        : { ...current, special: cardId };
    return {
      ...state,
      players: {
        ...state.players,
        [side]: { ...state.players[side], rows: { ...state.players[side].rows, [row]: nextRow } },
      },
    };
  };
}

export function withWeather(weather: CardInstanceId[]): Mutation {
  return (state) => ({ ...state, weather });
}

/** Gain on MY side from putting the card in the row (its own strength included). */
export function sideGain(
  state: GameState,
  side: PlayerId,
  row: CombatRow,
  cardId: CardInstanceId,
  slot: 'units' | 'special' = 'units',
): number {
  const before = computeBoard(state)[side].total;
  return computeBoard(withCardInRow(side, row, cardId, slot)(state))[side].total - before;
}

/** Strength the card would have in the row. */
export function powerInRow(
  state: GameState,
  side: PlayerId,
  row: CombatRow,
  cardId: CardInstanceId,
): number {
  const trial = computeBoard(withCardInRow(side, row, cardId)(state));
  return trial[side].rows[row].cards.find((c) => c.id === cardId)?.power ?? 0;
}

/** Best row for the player's agile unit; ties are decided by a coin flip. */
export function bestAgileRow(
  state: GameState,
  side: PlayerId,
  cardId: CardInstanceId,
  rng: RandomSource,
): CombatRow {
  const dif = sideGain(state, side, 'close', cardId) - sideGain(state, side, 'ranged', cardId);
  if (dif > 0) return 'close';
  if (dif < 0) return 'ranged';
  return rng.coin() ? 'close' : 'ranged';
}

/** Muster group used by the bot when discarding (prefix before the "-", without spaces). */
function musterGroup(name: string): string {
  const dash = name.indexOf('-');
  return dash === -1 ? name : name.substring(0, dash).trim();
}

/**
 * Hand cards from most to least disposable:
 * extra muster copies, duplicate weather, then the weakest units without abilities.
 */
export function discardOrder(
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
): CardInstanceId[] {
  const hand = state.players[player].hand;
  const def = (id: CardInstanceId) => defOf(state, id);
  const out: CardInstanceId[] = [];

  const musters = hand.filter((id) => def(id).abilities.includes('muster'));
  const groups: CardInstanceId[][] = [];
  while (musters.length > 0) {
    const current = musters.pop() as CardInstanceId;
    const name = musterGroup(def(current).name);
    const group = [current];
    for (let j = musters.length - 1; j >= 0; j--) {
      if (def(musters[j] as CardInstanceId).name.startsWith(name)) {
        group.push(musters.splice(j, 1)[0] as CardInstanceId);
      }
    }
    groups.push(group);
  }
  for (const group of groups) {
    group.sort((a, b) => compareCards(def(a), def(b)));
    group.pop(); // keep the strongest of the group
    out.push(...group);
  }

  const weathers = hand.filter((id) => def(id).type === 'weather');
  if (weathers.length > 1) {
    weathers.splice(rng.int(weathers.length), 1);
    out.push(...weathers);
  }

  const plain = hand.filter((id) => def(id).abilities.length === 0);
  plain.sort((a, b) => compareCards(def(a), def(b)));
  out.push(...plain);
  return out;
}
