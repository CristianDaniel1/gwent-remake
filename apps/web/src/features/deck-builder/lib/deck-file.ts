import type { DeckList } from '@gwent/engine';
import { DeckSchema } from '@gwent/shared';
import { downloadText } from '@/shared/lib/download';
import type { ImportResult } from '../interfaces/deck-file';

/**
 * Parses a deck file, checking only its format.
 *
 * @param text - File content.
 * @returns The deck, or the reason it could not be read.
 */
export const parseDeckFile = (text: string): ImportResult => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notParsable' };
  }
  const parsed = DeckSchema.safeParse(json);
  return parsed.success ? { ok: true, deck: parsed.data } : { ok: false, error: 'badFormat' };
};

/**
 * Serializes a deck to the deck file format.
 *
 * @param deck - Deck to serialize.
 * @returns The JSON text.
 */
export const deckToJson = (deck: DeckList): string =>
  JSON.stringify({ faction: deck.faction, leader: deck.leader, cards: deck.cards });

/**
 * Downloads a deck as a JSON file.
 *
 * @param deck - Deck to download.
 */
export const downloadDeck = (deck: DeckList): void => {
  downloadText(`gwent-${deck.faction}.json`, deckToJson(deck));
};
