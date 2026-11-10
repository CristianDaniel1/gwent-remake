import { z } from 'zod';
import { FACTIONS } from '../model/card';

/**
 * Deck format (JSON):
 * { "faction": "realms", "leader": 24, "cards": [[id, count], ...] }
 * Only validates the shape; deck building rules live in validateDeck.
 */
export const DeckListSchema = z.object({
  faction: z.enum(FACTIONS),
  leader: z.number().int().nonnegative(),
  cards: z
    .array(z.tuple([z.number().int().nonnegative(), z.number().int().positive()]).readonly())
    .readonly(),
});
