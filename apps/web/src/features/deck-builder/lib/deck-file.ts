import type { DeckList } from '@gwent/engine';
import { DeckSchema } from '@gwent/shared';
import { downloadText } from '@/shared/lib/download';

export type ImportResult =
  { ok: true; deck: DeckList } | { ok: false; error: 'notParsable' | 'badFormat' };

/**
 * Reads a JSON deck file:
 * { "faction": "realms", "leader": 24, "cards": [[id, count], ...] }.
 * Only checks the format; the rules (minimum units etc.) show up in the deck builder.
 */
export function parseDeckFile(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'notParsable' };
  }
  const parsed = DeckSchema.safeParse(json);
  return parsed.success ? { ok: true, deck: parsed.data } : { ok: false, error: 'badFormat' };
}

export function deckToJson(deck: DeckList): string {
  return JSON.stringify({ faction: deck.faction, leader: deck.leader, cards: deck.cards });
}

/** Downloads the deck as a .json file. */
export function downloadDeck(deck: DeckList): void {
  downloadText(`gwent-${deck.faction}.json`, deckToJson(deck));
}
