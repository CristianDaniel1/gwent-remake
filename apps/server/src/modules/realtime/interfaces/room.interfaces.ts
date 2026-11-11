import type { DeckList, GameAction, GameState, PlayerId } from '@gwent/engine';
import type { EnterRoom, RoomStatus } from '@gwent/shared';

/** A player's place at the table. */
export interface Seat {
  token: string;
  name: string;
  deck: DeckList;
  /** Server profile: the finished match goes to its history. */
  profileId?: string | undefined;
  /** null = disconnected (waiting to reconnect). */
  socketId: string | null;
  wantsRematch: boolean;
  graceTimer?: NodeJS.Timeout;
}

/** Where a session token sits: the room and the seat. */
export interface SeatLocation {
  code: string;
  player: PlayerId;
}

/** A multiplayer room, kept in memory. */
export interface Room {
  code: string;
  seats: Record<PlayerId, Seat | null>;
  status: RoomStatus;
  state: GameState | null;
  /** Seed and actions of the current match: enough to replay it. */
  seed: number;
  actions: GameAction[];
  /** Sockets watching the match (they see no hand). */
  spectators: Set<string>;
  turnTimer?: NodeJS.Timeout;
}

/** A player waiting in the quick match queue. */
export interface QueuedPlayer extends EnterRoom {
  socketId: string;
}
