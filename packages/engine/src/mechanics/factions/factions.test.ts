import { describe, expect, it } from 'vitest';
import { createGame } from '../../core/create-game';
import { getLegalActions } from '../../core/legal-actions';
import { act, plainDeck } from '../../testing/builders';
import { cardOf, defIds, scenario } from '../../testing/scenario';

const VES = 52; // close 5
const BALLISTA = 27; // siege 6
const FIEND = 111; // close 6
const BOTCHLING = 102; // close 4
const TREBUCHET = 54; // siege 6
const HARPY = 103; // agile 2

/** Both players pass (whoever has the turn goes first). */
function passBoth(state: ReturnType<typeof scenario>) {
  state = act(state, { type: 'PASS', player: state.currentPlayer! }).state;
  return act(state, { type: 'PASS', player: state.currentPlayer! });
}

describe('faction abilities', () => {
  it('lets Northern Realms draw a card after winning a round', () => {
    const state = scenario({
      factions: true,
      p1: { faction: 'realms', hand: [VES], deck: [BALLISTA], siege: [TREBUCHET] },
      p2: { faction: 'monsters', hand: [FIEND] },
    });
    const { state: next, events } = passBoth(state);
    expect(next.roundHistory[0]?.winner).toBe('p1');
    expect(defIds(next, next.players.p1.hand)).toEqual([VES, BALLISTA]);
    expect(events).toContainEqual({ type: 'FACTION_ABILITY', faction: 'realms', player: 'p1' });
  });

  it('keeps one Monsters unit on the board for the next round', () => {
    const state = scenario({
      factions: true,
      p1: { faction: 'realms', hand: [VES], close: [VES] },
      p2: { faction: 'monsters', hand: [FIEND], close: [FIEND, BOTCHLING] },
    });
    const { state: next, events } = passBoth(state);
    expect(next.players.p2.rows.close.units).toHaveLength(1);
    expect(next.players.p2.grave).toHaveLength(1);
    expect(next.players.p1.rows.close.units).toEqual([]);
    expect(events).toContainEqual({ type: 'FACTION_ABILITY', faction: 'monsters', player: 'p2' });
    // The "stays" mark is cleared at the start of the round
    expect(Object.values(next.cards).some((c) => c.noRemove)).toBe(false);
  });

  it("lets Scoia'tael choose who starts instead of the coin flip", () => {
    const { state, events } = createGame({
      seed: 1,
      decks: { p1: plainDeck('realms'), p2: plainDeck('scoiatael') },
    });
    expect(state.phase).toBe('setup');
    expect(state.players.p1.hand).toEqual([]);
    expect(events.at(-1)).toMatchObject({
      type: 'CHOICE_REQUESTED',
      choice: { player: 'p2', kind: 'firstPlayer' },
    });
    expect(getLegalActions(state, 'p2')).toHaveLength(2);

    const { state: dealt, events: after } = act(state, {
      type: 'CHOOSE',
      player: 'p2',
      optionIds: ['p1'],
    });
    expect(dealt.phase).toBe('redraw');
    expect(dealt.firstPlayer).toBe('p1');
    expect(after.some((e) => e.type === 'COIN_TOSSED')).toBe(false);
    expect(dealt.players.p1.hand).toHaveLength(10);
  });

  it("uses the coin flip in Scoia'tael versus Scoia'tael", () => {
    const { state } = createGame({
      seed: 1,
      decks: { p1: plainDeck('scoiatael'), p2: plainDeck('scoiatael') },
    });
    expect(state.phase).toBe('redraw');
    expect(state.flags.factionAbilitiesDisabled).toBe(true);
  });

  it('brings 2 Skellige units back from the grave at the start of round 3', () => {
    const state = scenario({
      factions: true,
      round: 2,
      p1: { faction: 'realms', hand: [VES] },
      p2: { faction: 'skellige', hand: [FIEND], grave: [BALLISTA, BOTCHLING, TREBUCHET] },
    });
    // Round 2 ends in a draw (0 x 0) and round 3 starts
    const { state: third, events } = passBoth(state);
    expect(third.round).toBe(3);
    expect(third.players.p2.grave).toHaveLength(1);
    const revived = events.filter((e) => e.type === 'CARD_MOVED' && e.reason === 'revive');
    expect(revived).toHaveLength(2);
    expect(events).toContainEqual({ type: 'FACTION_ABILITY', faction: 'skellige', player: 'p2' });
  });

  it('asks the owner for the row when Skellige revives an agile unit', () => {
    const state = scenario({
      factions: true,
      round: 2,
      p1: { faction: 'realms', hand: [VES] },
      p2: { faction: 'skellige', hand: [FIEND], grave: [HARPY] },
    });
    const { state: third } = passBoth(state);
    expect(third.pendingChoice).toMatchObject({ player: 'p2', kind: 'agileRow' });
    const placed = act(third, { type: 'CHOOSE', player: 'p2', optionIds: ['ranged'] }).state;
    expect(placed.players.p2.rows.ranged.units).toEqual([cardOf(placed, HARPY)]);
    expect(placed.pendingChoice).toBeNull();
  });
});
