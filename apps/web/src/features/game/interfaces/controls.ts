import type { CardInstanceId, GameAction } from '@gwent/engine';

export type PlayAction = Extract<GameAction, { type: 'PLAY_CARD' }>;

export interface TargetOption {
  action: GameAction;
  key: string;
  special: boolean;
}

export interface Targets {
  rows: Set<string>;
  specials: Set<string>;
  cards: Set<CardInstanceId>;
  free: PlayAction | null;
}

export type PrimaryActionKind = 'play' | 'useLeader';

export interface PrimaryAction {
  kind: PrimaryActionKind;
  run: () => void;
}
