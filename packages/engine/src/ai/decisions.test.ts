import { describe, expect, it } from 'vitest';
import { randomFrom } from '../core/rng';
import { act } from '../testing/builders';
import { cardOf, scenario } from '../testing/scenario';
import { chooseAiAction, planAiAction } from './index';

const rng = () => randomFrom({ state: 12345 });

const VES = 52; // close 5
const FIEND = 111; // close 6
const BALLISTA = 27; // siege 6
const FOOT_SOLDIER = 42; // close 1, no ability
const DIJKSTRA = 47; // spy close 4
const STENNIS = 41; // spy close 5
const DUN_BANNER_MEDIC = 32; // medic siege 5
const SCORCH = 10;
const DECOY = 1;
const HORN = 5;
const ESTERAD = 33; // hero close 10
const GERALT = 8; // hero 15

// With 1 gem the bot never passes on its own (pass weight = 0),
// so the weighted draw is only between cards and the test is deterministic.
describe('bot decisions', () => {
  it('passes when the opponent has passed and the bot is winning', () => {
    let state = scenario({
      p1: { hand: [VES] },
      p2: { hand: [FIEND, VES], close: [FIEND] },
      current: 'p1',
    });
    state = act(state, { type: 'PASS', player: 'p1' }).state;
    expect(planAiAction(state, 'p2', rng())).toEqual({ type: 'PASS', player: 'p2' });
  });

  it('keeps playing when the opponent has passed and the bot is losing', () => {
    let state = scenario({
      p1: { hand: [VES], close: [FIEND] },
      p2: { hand: [BALLISTA], health: 1 },
    });
    state = act(state, { type: 'PASS', player: 'p1' }).state;
    expect(planAiAction(state, 'p2', rng())).toMatchObject({
      type: 'PLAY_CARD',
      cardId: cardOf(state, BALLISTA),
    });
  });

  it("plays Scorch when the strongest unit on the board is the opponent's", () => {
    const state = scenario({
      p1: { close: [FIEND, FIEND] },
      p2: { hand: [SCORCH], close: [VES], health: 1 },
      current: 'p2',
    });
    expect(planAiAction(state, 'p2', rng())).toMatchObject({
      type: 'PLAY_CARD',
      cardId: cardOf(state, SCORCH),
    });
  });

  it('does not play Scorch when the strongest unit is its own', () => {
    const state = scenario({
      p1: { close: [VES] },
      p2: { hand: [SCORCH, FOOT_SOLDIER], close: [FIEND] },
      current: 'p2',
    });
    for (let seed = 1; seed <= 20; seed++) {
      const action = planAiAction(state, 'p2', randomFrom({ state: seed }));
      expect(action).not.toMatchObject({ cardId: cardOf(state, SCORCH) });
    }
  });

  it('uses Decoy to take back the spy on its side', () => {
    const state = scenario({
      p1: { hand: [VES] },
      p2: { hand: [DECOY], close: [DIJKSTRA, VES], health: 1 },
      current: 'p2',
    });
    // The spy is on p2's side (it was played by p1)
    expect(planAiAction(state, 'p2', rng())).toEqual({
      type: 'PLAY_CARD',
      player: 'p2',
      cardId: cardOf(state, DECOY),
      row: 'close',
      targetId: cardOf(state, DIJKSTRA),
    });
  });

  it("puts Commander's Horn on the row that gains the most", () => {
    const state = scenario({
      p1: { hand: [VES] },
      p2: { hand: [HORN], close: [VES], siege: [BALLISTA, BALLISTA], ranged: [ESTERAD], health: 1 },
      current: 'p2',
    });
    expect(planAiAction(state, 'p2', rng())).toMatchObject({
      cardId: cardOf(state, HORN),
      row: 'siege',
    });
  });

  it('revives a spy with the medic, preferring the weakest one', () => {
    let state = scenario({
      p1: { hand: [DUN_BANNER_MEDIC, VES], grave: [BALLISTA, STENNIS, DIJKSTRA, ESTERAD] },
    });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DUN_BANNER_MEDIC),
    }).state;
    expect(chooseAiAction(state, 'p1', rng())).toEqual({
      type: 'CHOOSE',
      player: 'p1',
      optionIds: [cardOf(state, DIJKSTRA)],
    });
  });

  it('redraws the weakest card without abilities and keeps strong heroes', () => {
    let state = scenario({ p1: { hand: [GERALT, FIEND, FOOT_SOLDIER, SCORCH], deck: [VES, VES] } });
    state = {
      ...state,
      phase: 'redraw',
      players: { ...state.players, p1: { ...state.players.p1, redrawDone: false } },
    };
    expect(planAiAction(state, 'p1', rng())).toEqual({
      type: 'REDRAW',
      player: 'p1',
      cardId: cardOf(state, FOOT_SOLDIER),
    });
  });

  it('acts only on its own turn or on its own choice', () => {
    const state = scenario({ p1: { hand: [VES] }, p2: { hand: [FIEND] }, current: 'p1' });
    expect(planAiAction(state, 'p2', rng())).toBeNull();
  });
});
