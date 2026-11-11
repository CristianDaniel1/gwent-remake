import type { GameAction, GameState, PlayerId } from '@gwent/engine';

export interface BotRequest {
  id: number;
  state: GameState;
  player: PlayerId;
  seed: number;
  budgetMs: number;
}

export interface BotResponse {
  id: number;
  action: GameAction | null;
}

export interface PendingThought {
  resolve: (action: GameAction | null) => void;
  fallback: () => GameAction | null;
}
