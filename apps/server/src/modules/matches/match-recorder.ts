import type { DeckList, GameAction, PlayerId } from '@gwent/engine';

/** A finished online match, as the multiplayer rooms know it. */
export interface OnlineMatchRecord {
  seed: number;
  decks: Record<PlayerId, DeckList>;
  /** Every action applied in the room, in order (including automatic timeout moves). */
  actions: GameAction[];
  players: Record<PlayerId, { name: string; profileId?: string | undefined }>;
}

/**
 * Saves finished online matches to the players' history. The multiplayer rooms only know
 * this interface, so they can be tested without a database.
 */
export interface MatchRecorder {
  recordOnline(match: OnlineMatchRecord): Promise<void>;
}

export const MATCH_RECORDER = Symbol('MATCH_RECORDER');
