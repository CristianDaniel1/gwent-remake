import { describe, expect, it } from 'vitest';
import { getLegalActions } from '../../core/legal-actions';
import { act } from '../../testing/builders';
import { cardOf, defIds, scenario } from '../../testing/scenario';

const SCORCH = 10;
const VILLENTRETENMERTH = 14; // scorch_c, close 7
const CLAN_DIMUN_PIRATE = 186; // global scorch, ranged 6
const DECOY = 1;
const VES = 52; // close 5
const SIEGFRIED = 46; // close 5
const FIEND = 111; // close 6
const BALLISTA = 27; // siege 6
const FOOT_SOLDIER = 42; // close 1
const TRISS = 12; // hero close 7
const ESTERAD = 33; // hero close 10
const BERSERKER = 181; // close 4
const YOUNG_BERSERKER = 210; // ranged 2
const MARDROEME = 202;
const ERMION = 195; // hero, mardroeme, ranged 8
const VILDKAARL = 206;
const YOUNG_VILDKAARL = 207;
const COW = 20; // avenger

describe('Scorch', () => {
  it('kills the strongest units on the whole board (both sides, ties included) but not heroes', () => {
    let state = scenario({
      p1: { hand: [SCORCH, VES], close: [FIEND, TRISS], siege: [BALLISTA] },
      p2: { close: [FIEND, VES] },
    });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, SCORCH) }).state;
    expect(defIds(state, state.players.p1.rows.close.units)).toEqual([TRISS]);
    expect(state.players.p1.rows.siege.units).toEqual([]);
    expect(defIds(state, state.players.p2.rows.close.units)).toEqual([VES]);
    expect(defIds(state, state.players.p1.grave)).toEqual([FIEND, BALLISTA, SCORCH]);
    expect(defIds(state, state.players.p2.grave)).toEqual([FIEND]);
  });

  it('does not count the unit itself for global Scorch', () => {
    let state = scenario({
      p1: { hand: [CLAN_DIMUN_PIRATE, VES] },
      p2: { close: [VES, FOOT_SOLDIER] },
    });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, CLAN_DIMUN_PIRATE),
    }).state;
    expect(defIds(state, state.players.p1.rows.ranged.units)).toEqual([CLAN_DIMUN_PIRATE]);
    expect(defIds(state, state.players.p2.rows.close.units)).toEqual([FOOT_SOLDIER]);
  });

  it("triggers row Scorch only when the opponent's row adds up to 10 or more", () => {
    let weak = scenario({
      p1: { hand: [VILLENTRETENMERTH, VES] },
      p2: { close: [VES, FOOT_SOLDIER] },
    });
    weak = act(weak, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(weak, VILLENTRETENMERTH),
    }).state;
    expect(weak.players.p2.rows.close.units).toHaveLength(2);

    let strong = scenario({
      p1: { hand: [VILLENTRETENMERTH, VES] },
      p2: { close: [VES, SIEGFRIED, ESTERAD] },
    });
    strong = act(strong, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(strong, VILLENTRETENMERTH),
    }).state;
    // Adds up to 20 (heroes count in the sum), but only the strongest regular units die
    expect(defIds(strong, strong.players.p2.rows.close.units)).toEqual([ESTERAD]);
  });
});

describe('Decoy', () => {
  it('swaps places with a unit on its own side, which returns to the hand', () => {
    let state = scenario({ p1: { hand: [DECOY], close: [VES, TRISS] } });
    const decoy = cardOf(state, DECOY);
    const targets = getLegalActions(state, 'p1')
      .filter((a) => a.type === 'PLAY_CARD' && a.cardId === decoy)
      .map((a) => (a.type === 'PLAY_CARD' ? a.targetId : null));
    // Heroes cannot be targeted
    expect(targets).toEqual([cardOf(state, VES)]);

    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: decoy,
      row: 'close',
      targetId: cardOf(state, VES),
    }).state;
    expect(defIds(state, state.players.p1.rows.close.units)).toEqual([TRISS, DECOY]);
    expect(defIds(state, state.players.p1.hand)).toEqual([VES]);
  });

  it('can take back the spy the opponent put on your side', () => {
    let state = scenario({
      p1: { hand: [DECOY], close: [VES] },
      p2: { hand: [47, FIEND] },
      current: 'p2',
    });
    state = act(state, { type: 'PLAY_CARD', player: 'p2', cardId: cardOf(state, 47) }).state;
    const spy = cardOf(state, 47);
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DECOY),
      row: 'close',
      targetId: spy,
    }).state;
    expect(state.players.p1.hand).toEqual([spy]);
    expect(state.cards[spy]?.owner).toBe('p1');
  });

  it('triggers the summon when used on an Avenger', () => {
    let state = scenario({ p1: { hand: [DECOY, VES], ranged: [COW] } });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DECOY),
      row: 'ranged',
      targetId: cardOf(state, COW),
    }).state;
    expect(defIds(state, state.players.p1.rows.close.units)).toEqual([21]);
  });
});

describe('Berserker and Mardroeme', () => {
  it('transforms the berserkers in the row with Mardroeme', () => {
    let state = scenario({
      p1: { faction: 'skellige', hand: [MARDROEME, VES], close: [BERSERKER, VES] },
    });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, MARDROEME),
      row: 'close',
    }).state;
    expect(defIds(state, state.players.p1.rows.close.units)).toEqual([VES, VILDKAARL]);
    // The transformed berserker ceases to exist (it does not go to the grave)
    expect(state.players.p1.grave).toEqual([]);
  });

  it('transforms a berserker played on a row with Mardroeme (or Ermion)', () => {
    let state = scenario({
      p1: { faction: 'skellige', hand: [YOUNG_BERSERKER, VES], ranged: [ERMION] },
    });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, YOUNG_BERSERKER),
    }).state;
    expect(defIds(state, state.players.p1.rows.ranged.units)).toEqual([ERMION, YOUNG_VILDKAARL]);
  });
});
