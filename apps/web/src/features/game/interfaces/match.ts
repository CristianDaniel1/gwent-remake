import type { GameAction, AiDifficulty, GameState, PlayerId, RandomSource } from '@gwent/engine';
import type { MatchSetup } from './setup';

export interface MatchBase {
  state: GameState;
  human: PlayerId;
  opponent: PlayerId;
}

export interface LocalMatch extends MatchBase {
  mode: 'local';
  setup: MatchSetup;
  botRandom: RandomSource;
  difficulty: AiDifficulty;
  actions: GameAction[];
}

export interface OnlineMatch extends MatchBase {
  mode: 'online';
  opponentName: string;
  /**
   * Sends an action to the server.
   *
   * @param action - Action to send.
   * @returns Resolves with false when the server refuses it.
   */
  send(action: GameAction): Promise<boolean>;
  awaiting: boolean;
}

export type Match = LocalMatch | OnlineMatch;

export interface ReadOnlyMatch extends MatchBase {
  mode: 'replay' | 'spectate';
  humanName: string;
  opponentName: string;
}

export type BoardMatch = Match | ReadOnlyMatch;
