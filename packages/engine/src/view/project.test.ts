import { describe, expect, it } from 'vitest';
import { chooseAiAction } from '../ai';
import { applyAction } from '../core/apply-action';
import { createGame } from '../core/create-game';
import { getLegalActions } from '../core/legal-actions';
import { randomFrom } from '../core/rng';
import { computeBoard } from '../core/scoring';
import { PREMADE_DECKS } from '../data/premade';
import type { DeckList } from '../model/card';
import type { GameEvent } from '../model/events';
import { opponentOf, PLAYER_IDS } from '../model/ids';
import type { GameState } from '../model/state';
import { projectEvents, projectFor } from './project';

/** Every state of a bot-vs-bot match. */
function statesOf(seed: number): GameState[] {
  const decks = {
    p1: PREMADE_DECKS[seed % PREMADE_DECKS.length] as DeckList,
    p2: PREMADE_DECKS[(seed * 3) % PREMADE_DECKS.length] as DeckList,
  };
  let { state } = createGame({ seed, decks });
  const states = [state];
  const rng = randomFrom({ state: seed });
  while (state.phase !== 'gameOver') {
    const action = (chooseAiAction(state, 'p1', rng) ?? chooseAiAction(state, 'p2', rng))!;
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    states.push(state);
  }
  return states;
}

describe('projectFor', () => {
  it("hides the opponent's hand, the decks, the seed and the random generator", () => {
    const state = statesOf(1)[5]!;
    const view = projectFor(state, 'p1');
    for (const id of state.players.p2.hand) expect(view.cards[id]).toBeUndefined();
    for (const p of PLAYER_IDS)
      for (const id of state.players[p].deck) expect(view.cards[id]).toBeUndefined();
    for (const id of state.players.p1.hand) expect(view.cards[id]).toEqual(state.cards[id]);
    expect(view.seed).toBe(0);
    expect(view.rng.deckGuest.state).toBe(0);
    // The counts stay visible
    expect(view.players.p2.hand).toHaveLength(state.players.p2.hand.length);
    expect(view.players.p2.deck).toHaveLength(state.players.p2.deck.length);
  });

  it('shows a spectator the board and graves but no hand and no choice options', () => {
    const states = statesOf(2);
    const withChoice = states.find((s) => s.pendingChoice && s.pendingChoice.options.length > 0);
    for (const state of [states[5]!, ...(withChoice ? [withChoice] : [])]) {
      const view = projectFor(state, null);
      for (const p of PLAYER_IDS) {
        for (const id of state.players[p].hand) expect(view.cards[id]).toBeUndefined();
        for (const id of state.players[p].grave) expect(view.cards[id]).toEqual(state.cards[id]);
        expect(view.players[p].hand).toHaveLength(state.players[p].hand.length);
      }
      expect(view.pendingChoice?.options ?? []).toEqual([]);
    }
  });

  it('lets the player compute the same legal actions and score from the projection (200+ states)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const state of statesOf(seed)) {
        for (const viewer of PLAYER_IDS) {
          const view = projectFor(state, viewer);
          expect(getLegalActions(view, viewer)).toEqual(getLegalActions(state, viewer));
          expect(computeBoard(view)).toEqual(computeBoard(state));
          // Opponent's choice: the player knows it exists but does not see the options
          if (state.pendingChoice?.player === opponentOf(viewer)) {
            expect(view.pendingChoice?.options).toEqual([]);
          }
        }
      }
    }
  });
});

describe('projectEvents', () => {
  it('delivers revealed cards only to the player who saw them', () => {
    const revealed: GameEvent = { type: 'CARDS_REVEALED', player: 'p1', cardIds: [] };
    expect(projectEvents([revealed], 'p1')).toEqual([revealed]);
    expect(projectEvents([revealed], 'p2')).toEqual([]);
  });
});
