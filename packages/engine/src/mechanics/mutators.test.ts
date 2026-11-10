import { describe, expect, it } from 'vitest';
import { applyAction } from '../core/apply-action';
import { createGame } from '../core/create-game';
import { getLegalActions } from '../core/legal-actions';
import { computeBoard } from '../core/scoring';
import { PREMADE_DECKS } from '../data/premade';
import type { DeckList } from '../model/card';
import { act } from '../testing/builders';
import { cardOf, scenario } from '../testing/scenario';
import { FULL_HANDS_EXTRA } from './mutators';
import { registerMutator } from './registry';

const VES = 52; // close 5
const FIEND = 111; // close 6
const BALLISTA = 27; // siege 6
const FROST = 2; // Biting Frost
const KING_BRAN = 212; // passive: weather only halves strength

const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[1] as DeckList };

describe('mutators', () => {
  it('rejects unknown mutators', () => {
    expect(() => createGame({ seed: 1, decks, mutators: ['nope'] })).toThrow('Unknown mutator');
  });

  it('fullHands: deals 12 cards to each player', () => {
    const plain = createGame({ seed: 1, decks }).state;
    const { state } = createGame({ seed: 1, decks, mutators: ['fullHands'] });
    for (const p of ['p1', 'p2'] as const) {
      expect(state.players[p].hand).toHaveLength(plain.players[p].hand.length + FULL_HANDS_EXTRA);
      expect(state.players[p].deck).toHaveLength(plain.players[p].deck.length - FULL_HANDS_EXTRA);
    }
  });

  it('noLeaders: turns off activatable and passive leader abilities', () => {
    const withBran = { ...decks, p2: { ...(PREMADE_DECKS[8] as DeckList), leader: KING_BRAN } };
    // King Bran applies his passive in the game start hooks
    const plain = createGame({ seed: 2, decks: withBran }).state;
    expect(plain.players.p2.halfWeather).toBe(true);

    const { state } = createGame({ seed: 2, decks: withBran, mutators: ['noLeaders'] });
    expect(state.players.p2.halfWeather).toBe(false);
    for (const p of ['p1', 'p2'] as const) {
      expect(state.players[p].leaderAvailable).toBe(false);
      expect(getLegalActions(state, p).some((a) => a.type === 'ACTIVATE_LEADER')).toBe(false);
    }
  });

  it('inspiration: gives +1 to a unit of the player who just moved, but not on a pass', () => {
    let state = scenario({
      p1: { hand: [VES, BALLISTA], close: [VES] },
      p2: { hand: [FIEND, FIEND] },
      mutators: ['inspiration'],
    });
    const boosts = (s: typeof state) =>
      Object.values(s.cards).reduce((sum, c) => sum + (c.boost ?? 0), 0);

    const played = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, BALLISTA) });
    state = played.state;
    expect(boosts(state)).toBe(1);
    expect(played.events).toContainEqual(
      expect.objectContaining({ type: 'MUTATOR_TRIGGERED', mutator: 'inspiration', player: 'p1' }),
    );
    // The bonus counts in the score: 5 + 6 + 1
    expect(computeBoard(state).p1.total).toBe(12);

    state = act(state, { type: 'PASS', player: 'p2' }).state;
    expect(boosts(state)).toBe(1);
  });

  it('inspiration: the bonus is lost when the card leaves the board', () => {
    let state = scenario({
      p1: { hand: [BALLISTA], close: [VES] },
      p2: { hand: [FIEND] },
      mutators: ['inspiration'],
    });
    state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, BALLISTA) }).state;
    state = act(state, { type: 'PASS', player: 'p2' }).state;
    // p1 has no cards left and passes automatically: the round ends and the board is cleared
    expect(state.round).toBe(2);
    expect(Object.values(state.cards).some((c) => c.boost)).toBe(false);
  });

  it('lingeringWeather: keeps the weather for the next round', () => {
    const play = (mutators: string[]) => {
      let state = scenario({
        p1: { hand: [FROST, VES], close: [VES] },
        p2: { hand: [FIEND], close: [FIEND] },
        mutators,
      });
      state = act(state, { type: 'PLAY_CARD', player: 'p1', cardId: cardOf(state, FROST) }).state;
      state = act(state, { type: 'PASS', player: 'p2' }).state;
      state = act(state, { type: 'PASS', player: 'p1' }).state;
      return state;
    };
    expect(play([]).weather).toHaveLength(0);
    const lingering = play(['lingeringWeather']);
    expect(lingering.round).toBe(2);
    expect(lingering.weather).toHaveLength(1);
  });

  it('accepts custom mutators registered at runtime', () => {
    const undo = registerMutator({
      id: 'test_round_draw',
      hooks: { roundStart: (ctx, owner) => void ctx.state.players[owner].hand.length },
    });
    try {
      const { state } = createGame({ seed: 3, decks, mutators: ['test_round_draw'] });
      expect(state.mutators).toEqual(['test_round_draw']);
      const result = applyAction(state, { type: 'END_REDRAW', player: 'p1' });
      expect(result.ok).toBe(true);
    } finally {
      undo();
    }
  });
});
