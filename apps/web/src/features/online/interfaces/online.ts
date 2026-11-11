import type { DeckList } from '@gwent/engine';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  RealtimeErrorCode,
  SpectatorUpdate,
  RoomView,
  RoomClosedReason,
  LiveRoom,
} from '@gwent/shared';
import type { Socket } from 'socket.io-client';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type OnlinePhase =
  'idle' | 'connecting' | 'searching' | 'waiting' | 'playing' | 'watching' | 'closed';

export type OnlineError = RealtimeErrorCode | 'CONNECTION';

export interface OnlineState {
  phase: OnlinePhase;
  room: RoomView | null;
  error: OnlineError | null;
  closedReason: RoomClosedReason | null;
  watched: (SpectatorUpdate & { seq: number }) | null;
  /**
   * Creates a private room and joins it.
   *
   * @param name - Player name.
   * @param deck - Player deck.
   * @param profileId - Server profile that records the match.
   */
  createRoom(name: string, deck: DeckList, profileId?: string): Promise<void>;
  /**
   * Joins a room by its code.
   *
   * @param code - Room code.
   * @param name - Player name.
   * @param deck - Player deck.
   * @param profileId - Server profile that records the match.
   */
  joinRoom(code: string, name: string, deck: DeckList, profileId?: string): Promise<void>;
  /**
   * Joins the matchmaking queue.
   *
   * @param name - Player name.
   * @param deck - Player deck.
   * @param profileId - Server profile that records the match.
   */
  quickMatch(name: string, deck: DeckList, profileId?: string): Promise<void>;
  /** Leaves the matchmaking queue. */
  cancelSearch(): void;
  /** Asks the opponent for a rematch. */
  rematch(): void;
  /** Leaves the current room. */
  leave(): void;
  /**
   * Takes back the seat of the saved room.
   *
   * @returns Resolves with whether the seat was taken back.
   */
  resume(): Promise<boolean>;
  /**
   * Watches a room as a spectator.
   *
   * @param code - Room code.
   */
  watch(code: string): Promise<void>;
  /**
   * Lists the matches being played now.
   *
   * @returns The live rooms, empty when the server cannot be reached.
   */
  liveRooms(): Promise<LiveRoom[]>;
}
