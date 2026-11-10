import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/create-game';
import { getLegalActions } from '../../core/legal-actions';
import { computeBoard } from '../../core/scoring';
import { act, plainDeck } from '../../testing/builders';
import { cardOf, defIds, scenario } from '../../testing/scenario';

// Leaders
const FOLTEST_KING = 22; // Impenetrable Fog from the deck
const FOLTEST_SIEGEMASTER = 24; // horn on siege
const FOLTEST_STEELFORGED = 25; // scorch the opponent's siege
const EMHYR_EMPEROR = 57; // reveals 3 cards
const EMHYR_WHITEFLAME = 58; // cancels leaders
const EMHYR_RELENTLESS = 59; // steals from the opponent's grave
const EREDIN_DESTROYER = 95; // discards 2, picks 1
const FRANCESCA_DAISY = 141; // 11 cards
const FRANCESCA_HOPE = 143; // repositions agile units
const CRACH = 211; // graves go back to the decks

// Cards
const FOG = 9;
const VES = 52; // close 5
const BALLISTA = 27; // siege 6
const TREBUCHET = 54; // siege 6
const FIEND = 111; // close 6
const BOTCHLING = 102; // close 4
const OLGIERD = 17; // agile morale 6
const BLUE_STRIPES = 28; // bond close 4
const HARPY = 103; // agile 2

describe('leaders', () => {
  it('can be activated once and end the turn', () => {
    let state = scenario({ p1: { leader: FOLTEST_KING, hand: [VES], deck: [VES, FOG] } });
    expect(getLegalActions(state, 'p1')).toContainEqual({ type: 'ACTIVATE_LEADER', player: 'p1' });
    const { state: after, events } = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' });
    expect(events[0]).toMatchObject({ type: 'LEADER_ACTIVATED', player: 'p1' });
    expect(defIds(after, after.weather)).toEqual([FOG]);
    expect(after.players.p1.leaderAvailable).toBe(false);
    expect(after.currentPlayer).toBe('p2');
    state = act(after, { type: 'PASS', player: 'p2' }).state;
    expect(getLegalActions(state, 'p1')).not.toContainEqual({
      type: 'ACTIVATE_LEADER',
      player: 'p1',
    });
  });

  it('Foltest, the Siegemaster: puts a temporary horn on siege that disappears at round end', () => {
    let state = scenario({ p1: { leader: FOLTEST_SIEGEMASTER, hand: [VES], siege: [BALLISTA] } });
    state = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' }).state;
    expect(computeBoard(state).p1.rows.siege.total).toBe(12);
    state = act(state, { type: 'PASS', player: 'p2' }).state;
    state = act(state, { type: 'PASS', player: 'p1' }).state;
    expect(state.players.p1.rows.siege.special).toBeNull();
    expect(defIds(state, state.players.p1.grave)).toEqual([BALLISTA]);
  });

  it("Foltest, the Steel-Forged: scorches the opponent's siege when it adds up to 10+", () => {
    let state = scenario({
      p1: { leader: FOLTEST_STEELFORGED, hand: [VES] },
      p2: { siege: [BALLISTA, TREBUCHET] },
    });
    state = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' }).state;
    expect(state.players.p2.rows.siege.units).toEqual([]);
  });

  it("Emhyr, the Emperor: reveals 3 random cards from the opponent's hand", () => {
    const state = scenario({
      p1: { faction: 'nilfgaard', leader: EMHYR_EMPEROR, hand: [VES] },
      p2: { hand: [FIEND, BOTCHLING, VES, BALLISTA] },
    });
    const { events } = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' });
    const revealed = events.find((e) => e.type === 'CARDS_REVEALED');
    expect(revealed).toMatchObject({ player: 'p1' });
    if (revealed?.type !== 'CARDS_REVEALED') throw new Error();
    expect(revealed.cardIds).toHaveLength(3);
    expect(revealed.cardIds.every((id) => state.players.p2.hand.includes(id))).toBe(true);
  });

  it("Emhyr, the White Flame: cancels both players' leaders", () => {
    const { state } = createGame({
      seed: 3,
      decks: {
        p1: { ...plainDeck('nilfgaard'), leader: EMHYR_WHITEFLAME },
        p2: { ...plainDeck('realms'), leader: FOLTEST_KING },
      },
    });
    expect(state.players.p1).toMatchObject({ leaderAvailable: false, leaderDisabled: true });
    expect(state.players.p2).toMatchObject({ leaderAvailable: false, leaderDisabled: true });
  });

  it("Emhyr, the Relentless: takes a unit from the opponent's grave", () => {
    let state = scenario({
      p1: { faction: 'nilfgaard', leader: EMHYR_RELENTLESS, hand: [VES] },
      p2: { grave: [FIEND] },
    });
    state = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' }).state;
    expect(state.pendingChoice).toMatchObject({ player: 'p1', kind: 'stealFromGrave' });
    const fiend = cardOf(state, FIEND);
    state = act(state, { type: 'CHOOSE', player: 'p1', optionIds: [fiend] }).state;
    expect(state.players.p1.hand).toContain(fiend);
    expect(state.cards[fiend]?.owner).toBe('p1');
  });

  it('Eredin, Destroyer of Worlds: needs 2 cards, discards 2 and picks 1 from the deck', () => {
    const blocked = scenario({
      p2: { faction: 'monsters', leader: EREDIN_DESTROYER, hand: [VES] },
      current: 'p2',
    });
    expect(getLegalActions(blocked, 'p2')).not.toContainEqual({
      type: 'ACTIVATE_LEADER',
      player: 'p2',
    });

    let state = scenario({
      p2: {
        faction: 'monsters',
        leader: EREDIN_DESTROYER,
        hand: [VES, FIEND, BOTCHLING],
        deck: [BALLISTA, TREBUCHET],
      },
      current: 'p2',
    });
    state = act(state, { type: 'ACTIVATE_LEADER', player: 'p2' }).state;
    expect(state.pendingChoice).toMatchObject({ kind: 'discard', min: 2, max: 2 });
    state = act(state, {
      type: 'CHOOSE',
      player: 'p2',
      optionIds: [cardOf(state, VES), cardOf(state, FIEND)],
    }).state;
    expect(state.pendingChoice).toMatchObject({ kind: 'drawFromDeck', min: 1, max: 1 });
    state = act(state, {
      type: 'CHOOSE',
      player: 'p2',
      optionIds: [cardOf(state, TREBUCHET)],
    }).state;
    expect(defIds(state, state.players.p2.hand)).toEqual([BOTCHLING, TREBUCHET]);
    expect(defIds(state, state.players.p2.grave)).toEqual([VES, FIEND]);
    expect(state.currentPlayer).toBe('p1');
  });

  it('Francesca, Daisy of the Valley: starts with 11 cards', () => {
    const { state } = createGame({
      seed: 5,
      decks: {
        p1: { ...plainDeck('scoiatael'), leader: FRANCESCA_DAISY },
        p2: plainDeck('realms'),
      },
    });
    // Scoia'tael chooses who starts before the cards are dealt
    const dealt = act(state, { type: 'CHOOSE', player: 'p1', optionIds: ['p1'] }).state;
    expect(dealt.players.p1.hand).toHaveLength(11);
    expect(dealt.players.p2.hand).toHaveLength(10);
  });

  it('Francesca, Hope of the Aen Seidhe: moves agile units to the row where they score most', () => {
    let state = scenario({
      p1: {
        faction: 'scoiatael',
        leader: FRANCESCA_HOPE,
        hand: [VES],
        close: [BLUE_STRIPES],
        ranged: [OLGIERD, HARPY],
      },
    });
    // Olgierd (morale) and the Harpy score more in close next to the Blue Stripes
    state = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' }).state;
    expect(defIds(state, state.players.p1.rows.close.units).sort()).toEqual(
      [BLUE_STRIPES, OLGIERD, HARPY].sort(),
    );
    expect(state.players.p1.rows.ranged.units).toEqual([]);
  });

  it("Crach an Craite: shuffles both players' graves back into their decks", () => {
    let state = scenario({
      p1: {
        faction: 'skellige',
        leader: CRACH,
        hand: [VES],
        deck: [VES],
        grave: [BALLISTA, FIEND],
      },
      p2: { deck: [BOTCHLING], grave: [TREBUCHET] },
    });
    state = act(state, { type: 'ACTIVATE_LEADER', player: 'p1' }).state;
    expect(state.players.p1.grave).toEqual([]);
    expect(state.players.p2.grave).toEqual([]);
    expect(defIds(state, state.players.p1.deck).sort()).toEqual([VES, BALLISTA, FIEND].sort());
    expect(defIds(state, state.players.p2.deck).sort()).toEqual([BOTCHLING, TREBUCHET].sort());
  });

  it.each([
    [
      212,
      'skellige',
      'King Bran: weather only halves strength',
      (st: ReturnType<typeof createGame>['state']) => st.players.p1.halfWeather,
    ],
    [
      97,
      'monsters',
      'Eredin, the Treacherous: spies with doubled strength',
      (st: ReturnType<typeof createGame>['state']) => st.flags.doubleSpyPower,
    ],
    [
      60,
      'nilfgaard',
      'Emhyr, the Invader: revive effects pick random units',
      (st: ReturnType<typeof createGame>['state']) => st.flags.randomRespawn,
    ],
  ] as const)(
    'applies the passive effect of leader %i (%s): %s',
    (leader, faction, _desc, check) => {
      const { state } = createGame({
        seed: 2,
        decks: { p1: { ...plainDeck(faction), leader }, p2: plainDeck('realms') },
      });
      expect(check(state)).toBe(true);
    },
  );
});
