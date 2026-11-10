import { describe, expect, it } from 'vitest';
import { computeBoard } from '../../core/scoring';
import { getLegalActions } from '../../core/legal-actions';
import { act } from '../../testing/builders';
import { cardOf, defIds, scenario } from '../../testing/scenario';

const DIJKSTRA = 47; // spy, close 4
const VES = 52; // close 5
const BALLISTA = 27; // siege 6
const FIEND = 111; // close 6
const TRISS = 12; // hero close 7
const DUN_BANNER_MEDIC = 32; // medic, siege 5
const HARPY = 103; // agile 2
const ARACHAS = [98, 99, 100]; // muster, close 4
const ARACHAS_BEHEMOTH = 101; // muster, siege 6 ("Arachas- Behemoth")
const GERALT = 8; // hero, muster → Roach
const ROACH = 214;
const COW = 20; // avenger, ranged 0
const BOVINE_DEFENSE_FORCE = 21;
const SCORCH = 10;

describe('Spy', () => {
  it("lands on the opponent's side, counts for them and lets the owner draw 2 cards", () => {
    let state = scenario({ p1: { hand: [DIJKSTRA, VES], deck: [BALLISTA, FIEND, TRISS] } });
    const spy = cardOf(state, DIJKSTRA);
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: spy }).state;

    expect(state.players.p2.rows.close.units).toEqual([spy]);
    expect(computeBoard(state).p2.total).toBe(4);
    expect(defIds(state, state.players.p1.hand)).toEqual([VES, BALLISTA, FIEND]);
    expect(state.players.p1.deck).toHaveLength(1);
    // It now belongs to the opponent: at the end of the round it goes to their grave
    expect(state.cards[spy]?.owner).toBe('p2');
  });

  it('draws whatever is left when the deck is almost empty', () => {
    let state = scenario({ p1: { hand: [DIJKSTRA, VES], deck: [BALLISTA] } });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, DIJKSTRA) }).state;
    expect(defIds(state, state.players.p1.hand)).toEqual([VES, BALLISTA]);
  });

  it('doubles spy strength with Eredin, the Treacherous', () => {
    const state = scenario({ p2: { close: [DIJKSTRA] }, flags: { doubleSpyPower: true } });
    expect(computeBoard(state).p2.total).toBe(8);
  });
});

describe('Medic', () => {
  it('asks for a unit from the grave (no heroes or specials) and plays it', () => {
    let state = scenario({
      p1: { hand: [DUN_BANNER_MEDIC, VES], grave: [BALLISTA, TRISS, SCORCH] },
    });
    const { state: asking, events } = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DUN_BANNER_MEDIC),
    });
    expect(asking.pendingChoice).toMatchObject({ player: 'p1', kind: 'medic', min: 1, max: 1 });
    expect(asking.pendingChoice?.options.map((o) => o.cardId)).toEqual([cardOf(state, BALLISTA)]);
    expect(events.at(-1)?.type).toBe('CHOICE_REQUESTED');
    // The turn does not pass while the choice is pending
    expect(asking.currentPlayer).toBe('p1');
    expect(getLegalActions(asking, 'p2')).toEqual([]);

    state = act(asking, {
      type: 'CHOOSE',
      player: 'p1',
      optionIds: [cardOf(state, BALLISTA)],
    }).state;
    expect(defIds(state, state.players.p1.rows.siege.units)).toEqual([DUN_BANNER_MEDIC, BALLISTA]);
    expect(state.pendingChoice).toBeNull();
    expect(state.currentPlayer).toBe('p2');
  });

  it('asks for the row when the revived unit is agile', () => {
    let state = scenario({ p1: { hand: [DUN_BANNER_MEDIC, VES], grave: [HARPY] } });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DUN_BANNER_MEDIC),
    }).state;
    state = act(state, { type: 'CHOOSE', player: 'p1', optionIds: [cardOf(state, HARPY)] }).state;
    expect(state.pendingChoice).toMatchObject({ kind: 'agileRow' });
    state = act(state, { type: 'CHOOSE', player: 'p1', optionIds: ['ranged'] }).state;
    expect(state.players.p1.rows.ranged.units).toEqual([cardOf(state, HARPY)]);
    expect(state.currentPlayer).toBe('p2');
  });

  it('does nothing when there are no units in the grave', () => {
    let state = scenario({ p1: { hand: [DUN_BANNER_MEDIC, VES], grave: [TRISS] } });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DUN_BANNER_MEDIC),
    }).state;
    expect(state.pendingChoice).toBeNull();
    expect(state.currentPlayer).toBe('p2');
  });

  it('revives a random unit without a choice with Emhyr, the Invader', () => {
    let state = scenario({
      p1: { hand: [DUN_BANNER_MEDIC, VES], grave: [BALLISTA, FIEND] },
      flags: { randomRespawn: true },
    });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: cardOf(state, DUN_BANNER_MEDIC),
    }).state;
    expect(state.pendingChoice).toBeNull();
    expect(state.players.p1.grave).toHaveLength(1);
  });

  it('chains the choices when a medic revives a medic', () => {
    let state = scenario({
      p1: { hand: [DUN_BANNER_MEDIC, VES], grave: [DUN_BANNER_MEDIC, BALLISTA] },
    });
    const [inHand, inGrave] = [
      cardOf(state, DUN_BANNER_MEDIC, 0),
      cardOf(state, DUN_BANNER_MEDIC, 1),
    ];
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: inHand }).state;
    state = act(state, { type: 'CHOOSE', player: 'p1', optionIds: [inGrave] }).state;
    expect(state.pendingChoice?.options.map((o) => o.cardId)).toEqual([cardOf(state, BALLISTA)]);
    state = act(state, {
      type: 'CHOOSE',
      player: 'p1',
      optionIds: [cardOf(state, BALLISTA)],
    }).state;
    expect(defIds(state, state.players.p1.rows.siege.units)).toEqual([
      DUN_BANNER_MEDIC,
      DUN_BANNER_MEDIC,
      BALLISTA,
    ]);
  });
});

describe('Muster', () => {
  it('summons cards of the same group from the deck (prefix before the "-") and leaves the hand alone', () => {
    let state = scenario({
      p2: {
        faction: 'monsters',
        hand: [ARACHAS[0]!, ARACHAS[1]!, FIEND],
        deck: [BALLISTA, ARACHAS[2]!, ARACHAS_BEHEMOTH],
      },
      current: 'p2',
    });
    state = act(state, {
      type: 'PLAY_CARD',
      player: 'p2',
      cardId: cardOf(state, ARACHAS[0]!),
    }).state;
    // ARACHAS[0] was played from the hand; ARACHAS[2] and the Behemoth came from the deck
    expect(defIds(state, state.players.p2.rows.close.units)).toEqual([ARACHAS[0], ARACHAS[2]]);
    expect(defIds(state, state.players.p2.rows.siege.units)).toEqual([ARACHAS_BEHEMOTH]);
    expect(defIds(state, state.players.p2.hand)).toEqual([ARACHAS[1], FIEND]);
    expect(defIds(state, state.players.p2.deck)).toEqual([BALLISTA]);
  });

  it('makes Geralt summon Roach (group defined on the card)', () => {
    let state = scenario({ p1: { hand: [GERALT, VES], deck: [ROACH] } });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, GERALT) }).state;
    expect(defIds(state, state.players.p1.rows.close.units)).toEqual([GERALT, ROACH]);
  });
});

describe('Avenger', () => {
  it('summons the Bovine Defense Force (token) in the close row when destroyed', () => {
    let state = scenario({ p1: { hand: [SCORCH, VES], ranged: [COW] }, p2: { close: [VES] } });
    // Scorch kills p2's Ves (5); the cow (0) stays. Then we test the cow leaving.
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, SCORCH) }).state;
    expect(state.players.p1.rows.ranged.units).toHaveLength(1);

    let other = scenario({ p1: { hand: [SCORCH, VES], ranged: [COW] } });
    other = act(other, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(other, SCORCH) }).state;
    expect(other.players.p1.rows.ranged.units).toEqual([]);
    const [token] = other.players.p1.rows.close.units;
    expect(token && other.cards[token]).toMatchObject({
      defId: BOVINE_DEFENSE_FORCE,
      isToken: true,
    });
    expect(defIds(other, other.players.p1.grave)).toEqual([COW, SCORCH]);
  });

  it('summons the token for the next round when leaving at round end', () => {
    let state = scenario({ p1: { hand: [VES], ranged: [COW] }, p2: { hand: [FIEND] } });
    state = act(state, { type: 'PASS', player: 'p1' }).state;
    state = act(state, { type: 'PASS', player: 'p2' }).state;
    expect(state.round).toBe(2);
    expect(defIds(state, state.players.p1.rows.close.units)).toEqual([BOVINE_DEFENSE_FORCE]);
    // Tokens vanish instead of going to the grave
    state = act(state, { type: 'PASS', player: state.currentPlayer! }).state;
    state = act(state, { type: 'PASS', player: state.currentPlayer! }).state;
    expect(defIds(state, state.players.p1.grave)).toEqual([COW]);
  });
});
