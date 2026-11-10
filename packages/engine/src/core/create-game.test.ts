import { describe, expect, it } from 'vitest';
import { expectCardsConserved, newGame, plainDeck } from '../testing/builders';
import { HAND_SIZE, MAX_REDRAWS, STARTING_HEALTH } from './create-game';

const deckSize = (faction: Parameters<typeof plainDeck>[0]) =>
  plainDeck(faction).cards.reduce((sum, [, count]) => sum + count, 0);

describe('createGame', () => {
  it('deals a 10-card hand to each player and leaves the rest in the deck', () => {
    const { state } = newGame();
    expect(state.phase).toBe('redraw');
    expect(state.round).toBe(0);
    for (const [player, faction] of [
      ['p1', 'realms'],
      ['p2', 'monsters'],
    ] as const) {
      const me = state.players[player];
      expect(me.faction).toBe(faction);
      expect(me.hand).toHaveLength(HAND_SIZE);
      expect(me.deck).toHaveLength(deckSize(faction) - HAND_SIZE);
      expect(me.health).toBe(STARTING_HEALTH);
      expect(me.redrawsLeft).toBe(MAX_REDRAWS);
      expect([...me.hand, ...me.deck].every((id) => state.cards[id]?.owner === player)).toBe(true);
    }
    expectCardsConserved(state);
  });

  it('decides who starts with a coin flip and emits the initial events', () => {
    const { state, events } = newGame();
    expect(state.firstPlayer).not.toBeNull();
    expect(events[0]).toEqual({ type: 'COIN_TOSSED', firstPlayer: state.firstPlayer });
    const draws = events.filter((e) => e.type === 'CARD_MOVED' && e.reason === 'draw');
    expect(draws).toHaveLength(2 * HAND_SIZE);
    expect(events).toHaveLength(1 + 2 * HAND_SIZE);
  });

  it('is deterministic: the same seed creates the same match', () => {
    expect(newGame({ seed: 99 }).state).toEqual(newGame({ seed: 99 }).state);
  });

  it('shuffles differently with different seeds', () => {
    const decks = new Set(
      [1, 2, 3, 4, 5].map((seed) =>
        JSON.stringify(
          newGame({ seed }).state.players.p1.hand.map(
            (id) => newGame({ seed }).state.cards[id]?.defId,
          ),
        ),
      ),
    );
    expect(decks.size).toBeGreaterThan(1);
  });

  it('uses a separate shuffle stream for each player', () => {
    // Changing p2's deck must not change the order of p1's deck.
    const a = newGame({ seed: 7, p2: 'monsters' }).state;
    const b = newGame({ seed: 7, p2: 'nilfgaard' }).state;
    const order = (s: typeof a) =>
      [...s.players.p1.hand, ...s.players.p1.deck].map((id) => s.cards[id]?.defId);
    expect(order(a)).toEqual(order(b));
  });
});
