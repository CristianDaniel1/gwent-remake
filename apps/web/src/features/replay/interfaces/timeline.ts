import type { GameState, GameAction, GameEvent } from '@gwent/engine';
import type { ReplayFile } from '@gwent/shared';

export type ReplaySource = Pick<ReplayFile, 'seed' | 'decks' | 'actions' | 'mutators'>;

export interface Frame {
  state: GameState;
  action: GameAction | null;
  events: readonly GameEvent[];
}

export interface Timeline {
  frames: Frame[];
  roundStarts: number[];
  brokenAt: number | null;
}
