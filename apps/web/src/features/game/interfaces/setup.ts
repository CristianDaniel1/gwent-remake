import type { PlayerId, DeckList, AiDifficulty } from '@gwent/engine';

export interface MatchSetup {
  seed: number;
  decks: Record<PlayerId, DeckList>;
  difficulty?: AiDifficulty;
  mutators?: readonly string[];
}
