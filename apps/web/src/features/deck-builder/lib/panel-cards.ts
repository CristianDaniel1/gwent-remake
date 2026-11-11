import { copiesInDeck, deckPool, findCardDef, type DeckList } from '@gwent/engine';
import { copiesLeft } from './deck-edit';
import type { PanelCard } from '../interfaces/panel-cards';

/**
 * Lists the faction cards that still have copies to add to the deck.
 *
 * @param deck - Deck being edited.
 * @returns The cards with their available copies.
 */
export const collectionCards = (deck: DeckList): PanelCard[] =>
  deckPool(deck.faction).flatMap((def) => {
    const count = copiesLeft(deck, def.id);
    return count > 0 ? [{ def, count, enabled: true }] : [];
  });

/**
 * Lists the cards in the deck.
 *
 * @param deck - Deck being edited.
 * @returns The cards with their copy counts.
 */
export const deckCards = (deck: DeckList): PanelCard[] =>
  deck.cards.flatMap(([id]) => {
    const def = findCardDef(id);
    return def ? [{ def, count: copiesInDeck(deck, id), enabled: true }] : [];
  });
