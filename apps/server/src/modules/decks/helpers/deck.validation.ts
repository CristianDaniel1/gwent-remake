import { UnprocessableEntityException } from '@nestjs/common';
import { validateDeck, type DeckList } from '@gwent/engine';
import { ALLOWED_WHILE_BUILDING } from '../constants/decks.constants';

/**
 * Rejects impossible decks (unknown card, another faction, too many copies…).
 *
 * @param deck - Deck to check.
 * @throws UnprocessableEntityException - When the deck has an issue not allowed while building.
 */
export const assertStorableDeck = (deck: DeckList): void => {
  const issues = validateDeck(deck).filter((issue) => !ALLOWED_WHILE_BUILDING.has(issue.code));
  if (issues.length) {
    throw new UnprocessableEntityException({ message: 'Invalid deck', details: issues });
  }
};
