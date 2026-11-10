import { z } from 'zod';
import { COMBAT_ROWS, FACTIONS, type CardDef } from '../model/card';
import type { CardDefId } from '../model/ids';
import rawCards from './cards.json';

const CardDefSchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string().min(1),
  faction: z.enum([...FACTIONS, 'neutral', 'special', 'weather']),
  type: z.enum(['unit', 'leader', 'special', 'weather']),
  row: z.enum([...COMBAT_ROWS, 'agile']).nullable(),
  strength: z.number().int().nonnegative(),
  hero: z.boolean(),
  abilities: z.array(z.string().min(1)),
  filename: z.string().min(1),
  image: z.string().min(1),
  count: z.number().int().nonnegative(),
  muster: z.string().optional(),
});

// Validated on load: a corrupted cards.json fails early, not in the middle of a match.
const parsed = z.array(CardDefSchema).parse(rawCards);
parsed.forEach((card, index) => {
  if (card.id !== index)
    throw new Error(`cards.json: id ${card.id} out of order (expected ${index})`);
  if (card.type === 'unit' && card.row === null)
    throw new Error(`cards.json: unit without a row (${card.name})`);
});

const CARDS = parsed as unknown as readonly CardDef[];

export function getCardDef(id: CardDefId): CardDef {
  const def = CARDS[id];
  if (!def) throw new Error(`Unknown card: ${id}`);
  return def;
}

export function findCardDef(id: number): CardDef | undefined {
  return CARDS[id];
}

export function allCardDefs(): readonly CardDef[] {
  return CARDS;
}
