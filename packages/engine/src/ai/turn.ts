// Bot turn decision: one weight for each hand card, for the leader and for passing,
// and a weighted draw between them.
import { canUseLeader } from '../core/turn-flow';
import type { RandomSource } from '../core/rng';
import { defOf, hasAbility } from '../core/zones';
import { getAbility } from '../mechanics/registry';
import { bestAgileRows } from '../mechanics/leaders/monsters-scoiatael-skellige';
import type { GameAction } from '../model/actions';
import { cardDefId, cardInstanceId, type CardInstanceId, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { COMBAT_ROWS, type CombatRow } from '../model/card';
import {
  analyze,
  bestAgileRow,
  discardOrder,
  netGain,
  powerInRow,
  sideGain,
  withWeather,
  type Analysis,
} from './analysis';

interface Option {
  weight: number;
  action: GameAction;
}

const COMMANDERS_HORN = 5;
const WEATHER_TYPES = ['frost', 'fog', 'rain'] as const;

// --- Weather ---

/**
 * Advantage of playing the weather card (may be negative). Clear Weather: removing all weather.
 * Weather of a type that is already active, or without its own type (Storm), is worth 1.
 */
function weatherWeight(a: Analysis, cardId: CardInstanceId): number {
  const { state, me } = a;
  const def = defOf(state, cardId);
  if (def.abilities.includes('clear')) {
    return state.weather.length === 0 ? 1 : netGain(state, me, withWeather([]));
  }
  const type = WEATHER_TYPES.find((t) => t === def.abilities[0]);
  if (!type) return 1;
  if (state.weather.some((id) => hasAbility(state, id, type))) return 1;
  return netGain(state, me, withWeather([...state.weather, cardId]));
}

/** Weight of a weather card pulled from the deck by a leader (0 when the card is missing). */
function weatherFromDeckWeight(a: Analysis, name: string): number {
  const card = a.state.players[a.me].deck.find((id) => defOf(a.state, id).name === name);
  return card ? Math.max(0, weatherWeight(a, card)) : 0;
}

// --- Helper weights ---

/** Hypothetical horn in the row slot: how much my side gains. */
function hornRowWeight(a: Analysis, row: CombatRow, hornId?: CardInstanceId): number {
  const { state, me } = a;
  if (state.players[me].rows[row].special !== null) return 0;
  if (hornId) return Math.max(0, sideGain(state, me, row, hornId, 'special'));
  // Leader horn: a virtual horn just for the simulation
  const virtual = cardInstanceId('ai-horn');
  const trial: GameState = {
    ...state,
    cards: {
      ...state.cards,
      [virtual]: { id: virtual, defId: cardDefId(COMMANDERS_HORN), owner: me },
    },
  };
  return Math.max(0, sideGain(trial, me, row, virtual, 'special'));
}

/** Scorch on an opponent row: sum of the units that would die (0 when the row is under 10). */
function scorchRowWeight(a: Analysis, row: CombatRow): number {
  if (a.board[a.opp].rows[row].total < 10) return 0;
  return a.rowMax[a.opp][row].reduce((sum, c) => sum + c.power, 0);
}

/** Is it worth reviving something from `owner`'s grave? */
function medicWeight(a: Analysis, score: number, owner: PlayerId): number {
  const units = a.state.players[owner].grave.filter((id) => {
    const def = defOf(a.state, id);
    return def.type === 'unit' && !def.hero;
  });
  if (units.length === 0) return Math.min(1, score);
  const grave = a.graves[owner];
  const bonus = grave.spy.length
    ? 50
    : grave.medic.length
      ? 15
      : grave.scorch.length
        ? 10
        : a.state.players[a.me].health === 1
          ? 1
          : 0;
  return score + bonus;
}

function rowHasMardroeme(state: GameState, side: PlayerId, row: CombatRow): boolean {
  const { units, special } = state.players[side].rows[row];
  return [...units, ...(special ? [special] : [])].some((id) => hasAbility(state, id, 'mardroeme'));
}

function countByName(state: GameState, ids: readonly CardInstanceId[], name: string): number {
  return ids.filter((id) => defOf(state, id).name === name).length;
}

function berserkerWeight(
  a: Analysis,
  cardId: CardInstanceId,
  row: CombatRow,
  score: number,
): number {
  const { state, me } = a;
  const def = defOf(state, cardId);
  const mardroemeInHand = state.players[me].hand.some((id) => hasAbility(state, id, 'mardroeme'));
  const rowMardroeme = rowHasMardroeme(state, me, row);
  if (!mardroemeInHand && !rowMardroeme) return score;
  let weight = score - def.strength;
  if (def.row === 'close') {
    weight += 14;
  } else {
    const units = state.players[me].rows[row].units;
    const n = rowMardroeme
      ? countByName(state, units, 'Transformed Young Vildkaarl')
      : countByName(state, units, 'Young Berserker');
    weight = 8 * ((n + 1) * (n + 1) - n * n) + n * weight;
  }
  return Math.max(1, weight);
}

/** Mardroeme (card or Ermion) on a row: how many berserkers become bears. Siege does not count. */
function mardroemeRowWeight(a: Analysis, cardId: CardInstanceId, row: 'close' | 'ranged'): number {
  const { state, me } = a;
  const def = defOf(state, cardId);
  if (def.name === 'Mardroeme' && state.players[me].rows[row].special !== null) return 0;
  const ermionInHand = state.players[me].hand.some((id) => defOf(state, id).name === 'Ermion');
  if (ermionInHand && def.name !== 'Ermion' && row === 'ranged') return 0;
  const n = countByName(
    state,
    state.players[me].rows[row].units,
    row === 'ranged' ? 'Young Berserker' : 'Berserker',
  );
  const weight = row === 'close' ? 10 * n : 8 * n * n - 2 * n;
  return Math.max(1, weight);
}

/** Best row for Mardroeme (ranged before close on a tie). */
function bestMardroemeRow(a: Analysis, cardId: CardInstanceId): CombatRow {
  return mardroemeRowWeight(a, cardId, 'close') > mardroemeRowWeight(a, cardId, 'ranged')
    ? 'close'
    : 'ranged';
}

// --- Hand cards ---

function decoyTarget(
  a: Analysis,
  rng: RandomSource,
): { row: CombatRow; targetId: CardInstanceId } | null {
  const { state, me, myField } = a;
  let target: CardInstanceId | undefined;
  if (myField.spy.length) {
    // The weakest spy (by current strength)
    const power = (id: CardInstanceId) =>
      COMBAT_ROWS.flatMap((r) => a.board[me].rows[r].cards).find((c) => c.id === id)?.power ?? 0;
    const min = Math.min(...myField.spy.map(power));
    target = myField.spy.find((id) => power(id) === min);
  } else if (myField.medic.length) {
    target = myField.medic[rng.int(myField.medic.length)];
  } else if (myField.scorch.length) {
    target = myField.scorch[rng.int(myField.scorch.length)];
  } else {
    const candidates = COMBAT_ROWS.flatMap((row) => a.rowMax[me][row]);
    target = candidates[rng.int(candidates.length)]?.id;
  }
  if (!target) return null;
  const row = COMBAT_ROWS.find((r) => state.players[me].rows[r].units.includes(target));
  return row ? { row, targetId: target } : null;
}

function planHandCard(a: Analysis, cardId: CardInstanceId, rng: RandomSource): Option {
  const { state, me, opp, myField, strongest } = a;
  const def = defOf(state, cardId);
  const play = (extra: Partial<Extract<GameAction, { type: 'PLAY_CARD' }>> = {}): GameAction => ({
    type: 'PLAY_CARD',
    player: me,
    cardId,
    ...extra,
  });

  if (def.abilities.includes('decoy')) {
    const weight = myField.spy.length
      ? 50
      : myField.medic.length
        ? 15
        : myField.scorch.length
          ? 10
          : strongest[me].length
            ? 1
            : 0;
    const target = weight > 0 ? decoyTarget(a, rng) : null;
    return target ? { weight, action: play(target) } : { weight: 0, action: play() };
  }

  if (def.type === 'special' && def.abilities.includes('horn')) {
    const rows = COMBAT_ROWS.map((row) => ({ row, weight: hornRowWeight(a, row, cardId) }));
    const best = rows.reduce((x, y) => (y.weight > x.weight ? y : x), {
      row: 'close' as CombatRow,
      weight: 0,
    });
    return { weight: Math.max(...rows.map((r) => r.weight)) / 2, action: play({ row: best.row }) };
  }

  if (def.abilities.includes('scorch')) {
    const powerOp = strongest[opp][0]?.power ?? 0;
    const powerMe = strongest[me][0]?.power ?? 0;
    const totalOp = powerOp * strongest[opp].length;
    const totalMe = powerMe * strongest[me].length;
    const weight =
      powerMe > powerOp ? 0 : powerMe < powerOp ? totalOp : Math.max(0, totalOp - totalMe);
    return {
      weight,
      action: def.type === 'unit' ? play({ row: unitRow(a, cardId, rng) }) : play(),
    };
  }

  if (def.abilities.includes('mardroeme')) {
    const weight = Math.max(
      mardroemeRowWeight(a, cardId, 'ranged'),
      mardroemeRowWeight(a, cardId, 'close'),
    );
    const row = def.type === 'special' ? bestMardroemeRow(a, cardId) : unitRow(a, cardId, rng);
    return { weight, action: play({ row }) };
  }

  if (def.type === 'weather')
    return { weight: Math.max(0, weatherWeight(a, cardId)), action: play() };

  // Units
  const row = unitRow(a, cardId, rng);
  const side = def.abilities.includes('spy') ? opp : me;
  let score = powerInRow(state, side, row, cardId);
  switch (def.abilities.at(-1)) {
    case 'bond':
    case 'morale':
    case 'horn':
      score = Math.max(0, sideGain(state, side, row, cardId));
      break;
    case 'medic':
      score = medicWeight(a, score, me);
      break;
    case 'spy':
      score = 15 + score;
      break;
    case 'muster':
      score *= 3;
      break;
    case 'scorch_c':
      score = Math.max(1, scorchRowWeight(a, 'close'));
      break;
    case 'scorch_r':
      score = Math.max(1, scorchRowWeight(a, 'ranged'));
      break;
    case 'scorch_s':
      score = Math.max(1, scorchRowWeight(a, 'siege'));
      break;
    case 'berserker':
      score = berserkerWeight(a, cardId, row, score);
      break;
    case 'avenger':
    case 'avenger_kambi':
      score += 50;
      break;
  }
  return { weight: score, action: play({ row }) };
}

function unitRow(a: Analysis, cardId: CardInstanceId, rng: RandomSource): CombatRow {
  const def = defOf(a.state, cardId);
  if (def.row === 'agile') return bestAgileRow(a.state, a.me, cardId, rng);
  return (def.row ?? 'close') as CombatRow;
}

// --- Leader and passing ---

function leaderWeight(a: Analysis, rng: RandomSource): number {
  const { state, me } = a;
  const leaderId = state.players[me].leader;
  const ability = defOf(state, leaderId).abilities[0] ?? '';
  const hand = state.players[me].hand;
  const handHas = (ab: string) => hand.some((id) => hasAbility(state, id, ab));

  switch (ability) {
    case 'foltest_king':
      return weatherFromDeckWeight(a, 'Impenetrable Fog');
    case 'emhyr_imperial':
      return weatherFromDeckWeight(a, 'Torrential Rain');
    case 'francesca_pureblood':
      return weatherFromDeckWeight(a, 'Biting Frost');
    case 'foltest_lord':
      return state.weather.length === 0 ? 1 : Math.max(0, netGain(state, me, withWeather([])));
    case 'foltest_siegemaster':
      return hornRowWeight(a, 'siege');
    case 'eredin_commander':
      return hornRowWeight(a, 'close');
    case 'francesca_beautiful':
      return hornRowWeight(a, 'ranged');
    case 'foltest_steelforged':
      return scorchRowWeight(a, 'siege');
    case 'foltest_son':
      return scorchRowWeight(a, 'ranged');
    case 'francesca_queen':
      return scorchRowWeight(a, 'close');
    case 'emhyr_emperor':
      return 0; // only reveals cards: useless for the bot
    case 'emhyr_relentless':
      return medicWeight(a, 0, a.opp);
    case 'eredin_bringer_of_death':
      return medicWeight(a, 0, me);
    case 'eredin_destroyer': {
      const cards = discardOrder(state, me, rng)
        .slice(0, 2)
        .filter((id) => defOf(state, id).strength < 7);
      if (cards.length < 2) return 0;
      return hasAbility(state, cards[0] as CardInstanceId, 'muster') ? 50 : 25;
    }
    case 'eredin_king':
      return bestWeatherInDeck(a)?.weight ?? -1;
    case 'francesca_hope':
      return bestAgileRows(state, me).gain;
    case 'crach_an_craite': {
      if (state.round < 2 || handHas('medic') || handHas('spy')) return 0;
      const deckHasMedic = state.players[me].deck.some((id) => hasAbility(state, id, 'medic'));
      if (handHas('decoy') && (a.myField.medic.length || (a.myField.spy.length && deckHasMedic)))
        return 0;
      return 15;
    }
    default:
      // New mechanic: use the weight it defines, or the default
      return getAbility(ability)?.aiWeight?.(state, me) ?? 10 + (state.round - 1) * 15;
  }
}

/** Deck weather with the biggest advantage (one per name). */
export function bestWeatherInDeck(
  a: Analysis,
  candidates: readonly CardInstanceId[] = a.state.players[a.me].deck,
): { cardId: CardInstanceId; weight: number } | null {
  const seen = new Set<string>();
  let best: { cardId: CardInstanceId; weight: number } | null = null;
  for (const id of candidates) {
    const def = defOf(a.state, id);
    if (def.type !== 'weather' || seen.has(def.name)) continue;
    seen.add(def.name);
    const weight = Math.max(0, weatherWeight(a, id));
    if (!best || weight > best.weight) best = { cardId: id, weight };
  }
  return best;
}

function passWeight(a: Analysis): number {
  const { state, me, opp, board } = a;
  if (state.players[me].health === 1) return 0;
  const dif = board[opp].total - board[me].total;
  if (dif > 30) return 100;
  const handDif = state.players[opp].hand.length - state.players[me].hand.length;
  if (dif < -30 && handDif > 2) return 100;
  return Math.floor(Math.abs(dif));
}

/** Picks the move for the turn. */
export function planTurn(state: GameState, me: PlayerId, rng: RandomSource): GameAction {
  const a = analyze(state, me);
  const pass: GameAction = { type: 'PASS', player: me };
  const myTotal = a.board[me].total;
  const oppTotal = a.board[a.opp].total;

  // Opponent already passed and I am winning (or tied as Nilfgaard): pass.
  if (state.players[a.opp].passed) {
    const winsTie =
      state.players[me].faction === 'nilfgaard' && state.players[a.opp].faction !== 'nilfgaard';
    if (myTotal > oppTotal || (winsTie && myTotal === oppTotal)) return pass;
  }

  const options = state.players[me].hand.map((id) => planHandCard(a, id, rng));
  if (canUseLeader(state, me)) {
    options.push({ weight: leaderWeight(a, rng), action: { type: 'ACTIVATE_LEADER', player: me } });
  }
  options.push({ weight: passWeight(a), action: pass });
  for (const o of options) o.weight = Math.max(0, o.weight);

  const total = options.reduce((sum, o) => sum + o.weight, 0);
  if (total === 0) {
    // Nothing looks good: play harmless weather or an Avenger; otherwise pass.
    for (const [i, id] of state.players[me].hand.entries()) {
      const def = defOf(state, id);
      if (
        (def.type === 'weather' && weatherWeight(a, id) > -1) ||
        def.abilities.includes('avenger')
      ) {
        return options[i]?.action ?? pass;
      }
    }
    return pass;
  }

  let roll = rng.int(total);
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option.action;
  }
  return pass;
}

/** Initial redraw: returns the most disposable card if it is weak (strength < 15). */
export function planRedraw(state: GameState, me: PlayerId, rng: RandomSource): GameAction {
  const candidate = discardOrder(state, me, rng)[0];
  const usable = state.players[me].redrawsLeft > 0 && state.players[me].deck.length > 0;
  if (usable && candidate && defOf(state, candidate).strength < 15) {
    return { type: 'REDRAW', player: me, cardId: candidate };
  }
  return { type: 'END_REDRAW', player: me };
}
