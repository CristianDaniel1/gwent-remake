import { z } from 'zod';
import type { DeckList, Faction } from '../model/card';
import { DeckListSchema } from './deck-schema';
import rawDecks from './premade-decks.json';

/** Premade decks (used by the bot). */
export const PREMADE_DECKS: readonly DeckList[] = z.array(DeckListSchema).parse(rawDecks);

export function premadeDecksFor(faction: Faction): DeckList[] {
  return PREMADE_DECKS.filter((d) => d.faction === faction);
}
