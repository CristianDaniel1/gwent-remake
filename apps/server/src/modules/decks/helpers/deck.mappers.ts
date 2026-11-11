import { DeckSchema, type DeckRecord, type SaveDeck } from '@gwent/shared';
import type { Deck as DeckRow } from '../../../generated/prisma/client';

/**
 * Converts a database row into the API format, validating the stored card list.
 *
 * @param row - Deck row.
 * @returns The deck as the API returns it.
 */
export const toDeckRecord = (row: DeckRow): DeckRecord => {
  const deck = DeckSchema.parse({ faction: row.faction, leader: row.leader, cards: row.cards });
  return { id: row.id, name: row.name, deck, updatedAt: row.updatedAt.toISOString() };
};

/**
 * Converts a saved deck into table columns.
 *
 * @param deckInput - Deck name and card list.
 * @returns The column values of the deck row.
 */
export const toDeckColumns = ({ name, deck }: SaveDeck) => ({
  name,
  faction: deck.faction,
  leader: deck.leader,
  cards: deck.cards.map(([id, count]) => [id, count]),
});
