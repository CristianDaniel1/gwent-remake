import { describe, expect, it } from 'vitest';
import { applyAction } from '../core/apply-action';
import { createGame } from '../core/create-game';
import { isLegalAction } from '../core/legal-actions';
import { randomFrom } from '../core/rng';
import { PREMADE_DECKS } from '../data/premade';
import type { DeckList } from '../model/card';
import { PLAYER_IDS } from '../model/ids';
import { act } from '../testing/builders';
import { scenario } from '../testing/scenario';
import { AI_DIFFICULTIES, chooseAiActionFor, determinize } from './difficulty';

const VES = 52; // close 5
const FIEND = 111; // close 6
const BOTCHLING = 102; // close 4
const FOOT_SOLDIER = 42; // close 1
const BALLISTA = 27; // siege 6

const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[1] as DeckList };

describe('determinize', () => {
  it("reshuffles only what the player cannot see and keeps the opponent's card pool", () => {
    const { state } = createGame({ seed: 3, decks });
    const world = determinize(state, 'p1', randomFrom({ state: 9 }));

    // What p1 sees stays the same
    expect(world.players.p1.hand).toEqual(state.players.p1.hand);
    expect(world.players.p1.rows).toEqual(state.players.p1.rows);
    expect([...world.players.p1.deck].sort()).toEqual([...state.players.p1.deck].sort());
    // The opponent's hand is redrawn from their own hand + deck, with the same size
    const pool = (s: typeof state) => [...s.players.p2.hand, ...s.players.p2.deck].sort();
    expect(world.players.p2.hand).toHaveLength(state.players.p2.hand.length);
    expect(pool(world)).toEqual(pool(state));
    expect(world.players.p2.hand).not.toEqual(state.players.p2.hand);
    // The input is not changed
    expect(state.players.p2.hand).toEqual(createGame({ seed: 3, decks }).state.players.p2.hand);
  });
});

describe('chooseAiActionFor', () => {
  it.each(AI_DIFFICULTIES)(
    'plays only legal moves for a whole match on %s',
    (difficulty) => {
      let { state } = createGame({ seed: 11, decks });
      const rng = randomFrom({ state: 11 });
      for (let step = 0; state.phase !== 'gameOver'; step++) {
        expect(step).toBeLessThan(500);
        const action = PLAYER_IDS.map((p) =>
          chooseAiActionFor(difficulty, state, p, rng, { samples: 1 }),
        ).find(Boolean);
        expect(action).toBeDefined();
        expect(isLegalAction(state, action!)).toBe(true);
        const result = applyAction(state, action!);
        if (!result.ok) throw new Error(result.error.code);
        state = result.state;
      }
    },
    // The hard bot simulates whole matches for every move: slow on a busy machine
    30_000,
  );

  it('makes the hard bot keep playing when passing would lose the match', () => {
    let state = scenario({
      p1: { hand: [FOOT_SOLDIER, BALLISTA], close: [VES], health: 1 },
      p2: { hand: [BOTCHLING], close: [FIEND], health: 1 },
      current: 'p2',
      round: 3,
    });
    state = act(state, { type: 'PASS', player: 'p2' }).state;
    const move = chooseAiActionFor('hard', state, 'p1', randomFrom({ state: 1 }), { samples: 4 });
    expect(move?.type).toBe('PLAY_CARD');
  });

  it('stops searching when told to, after at least one sample', () => {
    let { state: started } = createGame({ seed: 5, decks });
    const rng = randomFrom({ state: 5 });
    // Get to the first turn
    while (started.phase !== 'playing' || started.pendingChoice) {
      const current = started;
      const action = PLAYER_IDS.map((p) => chooseAiActionFor('normal', current, p, rng)).find(
        Boolean,
      )!;
      started = act(started, action).state;
    }
    let checks = 0;
    const move = chooseAiActionFor('hard', started, started.currentPlayer!, rng, {
      samples: 50,
      shouldStop: () => ++checks >= 1,
    });
    expect(checks).toBe(1);
    expect(isLegalAction(started, move!)).toBe(true);
  });
});
