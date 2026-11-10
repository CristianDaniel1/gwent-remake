import { describe, expect, it } from 'vitest';
import { allCardDefs } from '../data/catalog';
import { PREMADE_DECKS } from '../data/premade';
import type { DeckList } from '../model/card';
import { PLAYER_IDS } from '../model/ids';
import type { GameState } from '../model/state';
import { expectCardsConserved } from '../testing/builders';
import { applyAction } from './apply-action';
import { createGame } from './create-game';
import { getLegalActions } from './legal-actions';
import { randomFrom, type RandomSource } from './rng';

const LEADERS = allCardDefs().filter((d) => d.type === 'leader');

/** Random premade deck with a random leader of the same faction. */
function randomDeck(rng: RandomSource): DeckList {
  const deck = PREMADE_DECKS[rng.int(PREMADE_DECKS.length)] as DeckList;
  const leaders = LEADERS.filter((l) => l.faction === deck.faction);
  return { ...deck, leader: (leaders[rng.int(leaders.length)] ?? leaders[0])!.id };
}

/** Plays a whole match choosing legal actions at random (seeded). */
function randomMatch(seed: number): { state: GameState; leaders: number[] } {
  const chooser = randomFrom({ state: seed ^ 0xabcdef });
  const decks = { p1: randomDeck(chooser), p2: randomDeck(chooser) };
  let { state } = createGame({ seed, decks });
  let steps = 0;

  while (state.phase !== 'gameOver') {
    const actions = PLAYER_IDS.flatMap((p) => getLegalActions(state, p));
    expect(
      actions.length,
      `no legal actions at step ${steps} (phase ${state.phase})`,
    ).toBeGreaterThan(0);
    // Passing less often makes matches longer and exercises more effects
    const nonPass = actions.filter((a) => a.type !== 'PASS');
    const pool = nonPass.length > 0 && chooser.float() < 0.85 ? nonPass : actions;
    const action = pool[chooser.int(pool.length)]!;

    const result = applyAction(state, action);
    if (!result.ok) throw new Error(`Legal action rejected: ${JSON.stringify(action)}`);
    state = result.state;
    expectCardsConserved(state);
    // Between actions, the stack is only non-empty when someone has to choose something
    if (!state.pendingChoice) expect(state.stack).toEqual([]);
    expect(state.round).toBeLessThanOrEqual(3);
    if (++steps > 1000) throw new Error('Match did not finish');
  }
  return { state, leaders: [decks.p1.leader, decks.p2.leader] };
}

// Stress test: checks invariants after every move, so it takes a few seconds.
const STRESS_TIMEOUT_MS = 60_000;

describe('random match simulation with every premade deck and leader', () => {
  it(
    'finishes 500 matches without errors while keeping the invariants',
    () => {
      const results = { p1: 0, p2: 0, draw: 0 };
      const leadersSeen = new Set<number>();
      for (let seed = 1; seed <= 500; seed++) {
        const { state, leaders } = randomMatch(seed);
        leaders.forEach((l) => leadersSeen.add(l));
        expect(state.result).not.toBeNull();
        expect(state.roundHistory.length).toBeGreaterThanOrEqual(2);
        const loser = state.result === 'p1' ? 'p2' : state.result === 'p2' ? 'p1' : null;
        if (loser) expect(state.players[loser].health).toBe(0);
        results[state.result!]++;
      }
      expect(results.p1).toBeGreaterThan(0);
      expect(results.p2).toBeGreaterThan(0);
      // Every leader showed up in some match
      expect(leadersSeen.size).toBe(LEADERS.length);
    },
    STRESS_TIMEOUT_MS,
  );

  it('replays to the same final state from the same seed and actions', () => {
    expect(randomMatch(42).state).toEqual(randomMatch(42).state);
  });
});
