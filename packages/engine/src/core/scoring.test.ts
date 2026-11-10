import { afterEach, describe, expect, it } from 'vitest';
import { getCardDef } from '../data/catalog';
import { cardDefId } from '../model/ids';
import { registerAbility } from '../mechanics/registry';
import { POWER_STAGE } from '../mechanics/types';
import { act, startedGame, withHand } from '../testing/builders';
import { computeBoard } from './scoring';

const VES = 52; // realms, close, 5
const SIEGFRIED = 46; // realms, close, 5
const TRISS = 12; // hero, close, 7

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((undo) => undo());
  cleanups = [];
});

/**
 * Puts the cards on p1's board. One card stays in the hand: with an empty hand
 * p1 would pass automatically and the round would end, clearing the board.
 */
function boardWith(defIds: number[]) {
  let state = withHand(startedGame(), 'p1', [...defIds, VES]);
  state = {
    ...state,
    currentPlayer: 'p1',
    players: { ...state.players, p2: { ...state.players.p2, passed: true } },
  };
  for (let i = 0; i < defIds.length; i++) {
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: state.players.p1.hand[0]!,
    }).state;
  }
  return state;
}

describe('computeBoard', () => {
  it('sums card strength per row and per player', () => {
    const score = computeBoard(boardWith([VES, SIEGFRIED]));
    expect(score.p1.rows.close).toMatchObject({ total: 10 });
    expect(score.p1.total).toBe(10);
    expect(score.p2.total).toBe(0);
  });

  it('applies registered mechanic modifiers in stage order', () => {
    // Ves becomes a test card with two fake abilities: add 1 and double.
    const ves = getCardDef(cardDefId(VES));
    cleanups.push(
      registerAbility({
        id: '__plus1',
        modifiers: (_source, location) =>
          location === 'weather'
            ? []
            : [{ ...location, modifier: { stage: POWER_STAGE.morale, apply: (p) => p + 1 } }],
      }),
      registerAbility({
        id: '__double',
        modifiers: (_source, location) =>
          location === 'weather'
            ? []
            : [
                {
                  ...location,
                  modifier: { stage: POWER_STAGE.horn, key: 'double', apply: (p) => p * 2 },
                },
              ],
      }),
    );
    const original = ves.abilities;
    (ves as { abilities: readonly string[] }).abilities = ['__double', '__plus1', '__double'];
    try {
      const score = computeBoard(boardWith([VES, TRISS]));
      // Ves: (5 + 1) * 2 = 12 — add before doubling (stage order, not registration order),
      // and the two doublings with the same key count once. Triss is a hero and ignores everything.
      expect(score.p1.rows.close.cards.map((c) => c.power)).toEqual([12, 7]);
    } finally {
      (ves as { abilities: readonly string[] }).abilities = original;
    }
  });
});
