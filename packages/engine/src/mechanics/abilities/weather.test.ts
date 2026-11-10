import { describe, expect, it } from 'vitest';
import { computeBoard } from '../../core/scoring';
import { act } from '../../testing/builders';
import { cardOf, defIds, scenario } from '../../testing/scenario';

const FROST = 2;
const CLEAR = 4;
const FOG = 9;
const RAIN = 11;
const STORM = 204;
const VES = 52; // close 5
const BALLISTA = 27; // siege 6
const DETHMOLD = 31; // ranged 6
const TRISS = 12; // hero close 7
const FIEND = 111; // close 6

const powers = (
  state: ReturnType<typeof scenario>,
  side: 'p1' | 'p2',
  row: 'close' | 'ranged' | 'siege',
) => computeBoard(state)[side].rows[row].cards.map((c) => c.power);

describe('weather', () => {
  it('sets close units on both sides to 1 with Biting Frost, except heroes', () => {
    let state = scenario({
      p1: { hand: [FROST, VES], close: [VES, TRISS], siege: [BALLISTA] },
      p2: { close: [FIEND] },
    });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, FROST) }).state;
    expect(defIds(state, state.weather)).toEqual([FROST]);
    expect(powers(state, 'p1', 'close')).toEqual([1, 7]);
    expect(powers(state, 'p1', 'siege')).toEqual([6]);
    expect(powers(state, 'p2', 'close')).toEqual([1]);
  });

  it('sends a duplicate weather card straight to the grave', () => {
    let state = scenario({ p1: { hand: [FROST, VES] }, weather: [FROST] });
    const second = cardOf(state, FROST, 0); // the one in hand (created before the one already in play)
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: second }).state;
    expect(state.weather).toHaveLength(1);
    expect(state.players.p1.grave).toEqual([second]);
  });

  it('removes all weather with Clear Weather', () => {
    let state = scenario({
      p1: { hand: [CLEAR, VES], close: [VES], ranged: [DETHMOLD] },
      weather: [FROST, FOG],
    });
    expect(computeBoard(state).p1.total).toBe(2);
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, CLEAR) }).state;
    expect(state.weather).toEqual([]);
    expect(defIds(state, state.players.p1.grave).sort()).toEqual([CLEAR, FROST, FOG].sort());
    expect(computeBoard(state).p1.total).toBe(11);
  });

  it('affects ranged and siege with Skellige Storm', () => {
    let state = scenario({
      p1: { hand: [STORM, VES], close: [VES], ranged: [DETHMOLD], siege: [BALLISTA] },
    });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, STORM) }).state;
    expect([
      powers(state, 'p1', 'close'),
      powers(state, 'p1', 'ranged'),
      powers(state, 'p1', 'siege'),
    ]).toEqual([[5], [1], [1]]);
  });

  it('does not treat Storm as a duplicate when Rain is active (different names)', () => {
    let state = scenario({ p1: { hand: [STORM, VES] }, weather: [RAIN] });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, STORM) }).state;
    expect(state.weather).toHaveLength(2);
  });

  it("halves strength (minimum 1) on King Bran's side instead of setting it to 1", () => {
    let state = scenario({
      p1: { hand: [FROST, VES], close: [VES] },
      p2: { faction: 'skellige', close: [FIEND] },
    });
    state = {
      ...state,
      players: { ...state.players, p2: { ...state.players.p2, halfWeather: true } },
    };
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, FROST) }).state;
    expect(powers(state, 'p1', 'close')).toEqual([1]);
    expect(powers(state, 'p2', 'close')).toEqual([3]);
  });
});
