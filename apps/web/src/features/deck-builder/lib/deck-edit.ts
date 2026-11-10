import { allowedInFaction, copiesInDeck, findCardDef, type DeckList } from '@gwent/engine';

/** Copies that can still be added (card limit − copies already in the deck). */
export function copiesLeft(deck: DeckList, cardId: number): number {
  const def = findCardDef(cardId);
  if (!def || def.type === 'leader' || !allowedInFaction(def, deck.faction)) return 0;
  return Math.max(0, def.count - copiesInDeck(deck, cardId));
}

/** Adds a copy (if it fits). Keeps the list sorted by id. */
export function addCopy(deck: DeckList, cardId: number): DeckList {
  if (copiesLeft(deck, cardId) === 0) return deck;
  const has = deck.cards.some(([id]) => id === cardId);
  const cards = has
    ? deck.cards.map(([id, n]) => [id, id === cardId ? n + 1 : n] as const)
    : [...deck.cards, [cardId, 1] as const].sort(([a], [b]) => a - b);
  return { ...deck, cards };
}

/** Removes a copy (the entry disappears when it reaches zero). */
export function removeCopy(deck: DeckList, cardId: number): DeckList {
  if (copiesInDeck(deck, cardId) === 0) return deck;
  const cards = deck.cards
    .map(([id, n]) => [id, id === cardId ? n - 1 : n] as const)
    .filter(([, n]) => n > 0);
  return { ...deck, cards };
}
