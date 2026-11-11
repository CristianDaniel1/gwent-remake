import { allowedInFaction, copiesInDeck, findCardDef, type DeckList } from '@gwent/engine';

/**
 * Counts how many more copies of a card the deck can take.
 *
 * @param deck - Deck being edited.
 * @param cardId - Card id to check.
 * @returns The number of copies that can still be added.
 */
export const copiesLeft = (deck: DeckList, cardId: number): number => {
  const def = findCardDef(cardId);
  if (!def || def.type === 'leader' || !allowedInFaction(def, deck.faction)) return 0;
  return Math.max(0, def.count - copiesInDeck(deck, cardId));
};

/**
 * Adds one copy of a card, keeping the list sorted by id.
 *
 * @param deck - Deck being edited.
 * @param cardId - Card id to add.
 * @returns The updated deck, or the same deck when the card does not fit.
 */
export const addCopy = (deck: DeckList, cardId: number): DeckList => {
  if (copiesLeft(deck, cardId) === 0) return deck;
  const has = deck.cards.some(([id]) => id === cardId);
  const cards = has
    ? deck.cards.map(([id, count]) => [id, id === cardId ? count + 1 : count] as const)
    : [...deck.cards, [cardId, 1] as const].sort(([left], [right]) => left - right);
  return { ...deck, cards };
};

/**
 * Removes one copy of a card, dropping entries that reach zero.
 *
 * @param deck - Deck being edited.
 * @param cardId - Card id to remove.
 * @returns The updated deck, or the same deck when the card is not in it.
 */
export const removeCopy = (deck: DeckList, cardId: number): DeckList => {
  if (copiesInDeck(deck, cardId) === 0) return deck;
  const cards = deck.cards
    .map(([id, count]) => [id, id === cardId ? count - 1 : count] as const)
    .filter(([, count]) => count > 0);
  return { ...deck, cards };
};
