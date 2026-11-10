import type { GameEvent, GameState, PlayerId } from '@gwent/engine';
import { z } from 'zod';
import { GameActionSchema } from '../api/schemas';
import { DeckSchema } from '../schemas/deck';

// Multiplayer contracts (Socket.IO). The server validates messages with these schemas;
// the event interfaces type both sides (socket.io and socket.io-client).

/** No 0/O/1/I/L, to avoid confusion when reading the code aloud. */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 5;

const PlayerNameSchema = z.string().trim().min(1).max(40);

export const EnterRoomSchema = z.object({
  name: PlayerNameSchema,
  deck: DeckSchema,
  /** Server profile of the player, if any: the finished match goes to its history. */
  profileId: z.uuid().optional(),
});
export type EnterRoom = z.infer<typeof EnterRoomSchema>;

/** Room code: 5 characters from the alphabet above (lowercase is accepted). */
const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(ROOM_CODE_LENGTH)
  .regex(new RegExp('^[' + ROOM_CODE_ALPHABET + ']+$'));

export const JoinRoomSchema = EnterRoomSchema.extend({ code: RoomCodeSchema });
export type JoinRoom = z.infer<typeof JoinRoomSchema>;

/** Watch a room as a spectator. */
export const WatchRoomSchema = z.object({ code: RoomCodeSchema });
export type WatchRoom = z.infer<typeof WatchRoomSchema>;

export const ResumeSessionSchema = z.object({ token: z.uuid() });
export type ResumeSession = z.infer<typeof ResumeSessionSchema>;

export const GameActionMessageSchema = z.object({ action: GameActionSchema });
export type GameActionMessage = z.infer<typeof GameActionMessageSchema>;

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface SeatView {
  name: string;
  connected: boolean;
  /** Asked for a rematch on the end screen. */
  wantsRematch: boolean;
}

export interface RoomView {
  code: string;
  /** Seat of whoever receives this message (null for a spectator). */
  you: PlayerId | null;
  status: RoomStatus;
  seats: Record<PlayerId, SeatView | null>;
  /** How many people are watching. */
  spectators: number;
}

/** What a spectator receives: the match without any hand (projectFor with no viewer). */
export interface SpectatorUpdate {
  state: GameState;
  events: GameEvent[];
}

/** A match being played now, for the lobby list. */
export interface LiveRoom {
  code: string;
  names: Record<PlayerId, string>;
  round: number;
  spectators: number;
}

/** State visible to the player (projectFor) + events from the last move (projectEvents). */
export interface GameUpdate {
  you: PlayerId;
  state: GameState;
  events: GameEvent[];
}

/** Joined the room: keep the token to reconnect if the connection drops. */
export interface JoinedRoom {
  token: string;
  room: RoomView;
}

export type RealtimeErrorCode =
  | 'INVALID_MESSAGE'
  | 'INVALID_DECK'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'SESSION_NOT_FOUND'
  | 'NOT_IN_ROOM'
  | 'ILLEGAL_ACTION'
  | 'RATE_LIMITED'
  | 'ALREADY_IN_ROOM';

export type Ack<T> = { ok: true; data: T } | { ok: false; error: RealtimeErrorCode };

export type RoomClosedReason = 'opponentLeft' | 'opponentTimedOut';

export interface ClientToServerEvents {
  'room:create': (request: EnterRoom, ack: (res: Ack<JoinedRoom>) => void) => void;
  'room:join': (request: JoinRoom, ack: (res: Ack<JoinedRoom>) => void) => void;
  /** Quick match: waits for the next player in the queue (the answer comes in 'room:joined'). */
  'queue:join': (request: EnterRoom, ack: (res: Ack<{ waiting: number }>) => void) => void;
  'queue:leave': () => void;
  'session:resume': (request: ResumeSession, ack: (res: Ack<JoinedRoom>) => void) => void;
  'game:action': (message: GameActionMessage, ack: (res: Ack<null>) => void) => void;
  'room:rematch': () => void;
  /** Leaves the room (players) or stops watching (spectators). */
  'room:leave': () => void;
  /** Watch a room as a spectator: no hand is visible. */
  'room:watch': (request: WatchRoom, ack: (res: Ack<{ room: RoomView }>) => void) => void;
  /** Matches being played now. */
  'rooms:live': (ack: (res: Ack<LiveRoom[]>) => void) => void;
}

export interface ServerToClientEvents {
  /** Paired in the quick match. */
  'room:joined': (joined: JoinedRoom) => void;
  'room:update': (room: RoomView) => void;
  'game:update': (update: GameUpdate) => void;
  'spectate:update': (update: SpectatorUpdate) => void;
  'room:closed': (reason: RoomClosedReason) => void;
}
