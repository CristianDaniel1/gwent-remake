import { describe, expect, it } from 'vitest';
import { computeBoard } from '../../core/scoring';
import { getLegalActions } from '../../core/legal-actions';
import { act } from '../../testing/builders';
import { cardOf, scenario } from '../../testing/scenario';

const HORN = 5;
const DANDELION = 6; // horn, close 2
const VES = 52; // close 5
const SIEGFRIED = 46; // close 5
const TRISS = 12; // hero close 7
const SIEGE_EXPERT = 35; // morale, siege 1 (3 copies: 35, 36, 37)
const SIEGE_EXPERT_2 = 36;
const BALLISTA = 27; // siege 6
const BLUE_STRIPES = 28; // bond, close 4
const FROST = 2;

const closePowers = (state: ReturnType<typeof scenario>) =>
  computeBoard(state).p1.rows.close.cards.map((c) => c.power);

describe("Commander's Horn", () => {
  it('doubles the units in the row (not heroes) and takes the special slot', () => {
    let state = scenario({ p1: { hand: [HORN, VES], close: [VES, TRISS] } });
    const horn = cardOf(state, HORN);
    const rows = getLegalActions(state, 'p1')
      .filter((a) => a.type === 'PLAY_CARD' && a.cardId === horn)
      .map((a) => (a.type === 'PLAY_CARD' ? a.row : null));
    expect(rows).toEqual(['close', 'ranged', 'siege']);

    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: horn, row: 'close' }).state;
    expect(state.players.p1.rows.close.special).toBe(horn);
    expect(closePowers(state)).toEqual([10, 7]);
  });

  it('cannot go to a row whose special slot is taken', () => {
    const state = scenario({ p1: { hand: [HORN], special: { close: HORN } } });
    const inHand = state.players.p1.hand[0];
    const rows = getLegalActions(state, 'p1')
      .filter((a) => a.type === 'PLAY_CARD' && a.cardId === inHand)
      .map((a) => (a.type === 'PLAY_CARD' ? a.row : null));
    expect(rows).toEqual(['ranged', 'siege']);
  });

  it('does not let a horn unit (Dandelion) double itself, and two horns do not stack', () => {
    expect(closePowers(scenario({ p1: { close: [DANDELION, VES] } }))).toEqual([2, 10]);
    expect(
      closePowers(scenario({ p1: { close: [DANDELION, VES], special: { close: HORN } } })),
    ).toEqual([4, 10]);
  });

  it('is applied after weather', () => {
    const state = scenario({ p1: { close: [VES], special: { close: HORN } }, weather: [FROST] });
    expect(closePowers(state)).toEqual([2]);
  });
});

describe('Morale', () => {
  it('gives +1 to the other units in the row, not to itself', () => {
    const state = scenario({ p1: { siege: [SIEGE_EXPERT, SIEGE_EXPERT_2, BALLISTA] } });
    expect(computeBoard(state).p1.rows.siege.cards.map((c) => c.power)).toEqual([2, 2, 8]);
  });
});

describe('Tight Bond', () => {
  it('multiplies by the number of identical cards in the row', () => {
    expect(closePowers(scenario({ p1: { close: [BLUE_STRIPES] } }))).toEqual([4]);
    expect(
      closePowers(scenario({ p1: { close: [BLUE_STRIPES, BLUE_STRIPES, SIEGFRIED] } })),
    ).toEqual([8, 8, 5]);
    expect(
      closePowers(scenario({ p1: { close: [BLUE_STRIPES, BLUE_STRIPES, BLUE_STRIPES] } })),
    ).toEqual([12, 12, 12]);
  });
});
