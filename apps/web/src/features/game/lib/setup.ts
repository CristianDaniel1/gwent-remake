import type { AiDifficulty, DeckList, PlayerId } from '@gwent/engine';

export interface MatchSetup {
  seed: number;
  decks: Record<PlayerId, DeckList>;
  /** Computer opponent strength (default: normal). */
  difficulty?: AiDifficulty;
  /** Extra match rules (engine mutator ids). */
  mutators?: readonly string[];
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32) >>> 0;
}
