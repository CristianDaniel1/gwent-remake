import {
  deriveSeed,
  PREMADE_DECKS,
  randomFrom,
  validateDeck,
  type DeckList,
  type PlayerId,
} from '@gwent/engine';
import { useDecksStore } from '../store/decks.store';

/**
 * Picks the decks of both players for a match.
 *
 * @param seed - Match seed, used to draw the computer's premade deck.
 * @returns The decks by player, or null when the player's deck is not valid.
 */
export const matchDecks = (seed: number): Record<PlayerId, DeckList> | null => {
  const { faction, decks, opponent } = useDecksStore.getState();
  const human = decks[faction];
  if (validateDeck(human).length) return null;
  if (opponent.kind === 'custom' && !validateDeck(opponent.deck).length) {
    return { p1: human, p2: opponent.deck };
  }
  const random = randomFrom({ state: deriveSeed(seed, 'opponent') });
  return { p1: human, p2: PREMADE_DECKS[random.int(PREMADE_DECKS.length)] as DeckList };
};
