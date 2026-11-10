import type { GameAction, GameState, PlayerId } from '@gwent/engine';

/** Messages between the page and the bot worker (the state is plain, serializable data). */
export interface BotRequest {
  id: number;
  state: GameState;
  player: PlayerId;
  /** Seed for this decision's random source (keeps the match reproducible per decision). */
  seed: number;
  /** How long the bot may think. */
  budgetMs: number;
}

export interface BotResponse {
  id: number;
  action: GameAction | null;
}
