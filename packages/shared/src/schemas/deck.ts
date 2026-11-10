import { DeckListSchema, type DeckList } from '@gwent/engine';

/**
 * Saved/imported deck. The schema comes from the engine (single source); the deck
 * building rules (minimum units etc.) live in the engine's validateDeck.
 */
export const DeckSchema = DeckListSchema;
export type Deck = DeckList;
