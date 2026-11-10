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
 * Match decks: the player's (current deck builder faction) and the bot's (uploaded by the
 * player or a premade deck drawn from the seed). Returns null when the player's deck
 * is not ready to play.
 */
export function matchDecks(seed: number): Record<PlayerId, DeckList> | null {
  const { faction, decks, opponent } = useDecksStore.getState();
  const human = decks[faction];
  if (validateDeck(human).length > 0) return null;
  if (opponent.kind === 'custom' && validateDeck(opponent.deck).length === 0) {
    return { p1: human, p2: opponent.deck };
  }
  const rng = randomFrom({ state: deriveSeed(seed, 'opponent') });
  return { p1: human, p2: PREMADE_DECKS[rng.int(PREMADE_DECKS.length)] as DeckList };
}
