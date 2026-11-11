import type {
  GameUpdate,
  JoinedRoom,
  RoomClosedReason,
  RoomView,
  SpectatorUpdate,
} from '@gwent/shared';
import type { RoomNotifier } from '../../src/modules/realtime/interfaces/room-notifier.interface';

/**
 * Appends a message to the list of one socket.
 *
 * @param messages - Messages by socket.
 * @param socketId - Socket that received the message.
 * @param message - Message received.
 */
const append = <T>(messages: Map<string, T[]>, socketId: string, message: T) => {
  messages.set(socketId, [...(messages.get(socketId) ?? []), message]);
};

/** RoomNotifier that keeps what each socket received, for the RoomsService tests. */
export class FakeNotifier implements RoomNotifier {
  readonly games = new Map<string, GameUpdate[]>();
  readonly watched = new Map<string, SpectatorUpdate[]>();
  readonly rooms = new Map<string, RoomView[]>();
  readonly closed = new Map<string, RoomClosedReason>();
  readonly joinedBy = new Map<string, JoinedRoom>();

  joined(socketId: string, joined: JoinedRoom) {
    this.joinedBy.set(socketId, joined);
  }

  roomUpdate(socketId: string, room: RoomView) {
    append(this.rooms, socketId, room);
  }

  gameUpdate(socketId: string, update: GameUpdate) {
    append(this.games, socketId, update);
  }

  spectatorUpdate(socketId: string, update: SpectatorUpdate) {
    append(this.watched, socketId, update);
  }

  roomClosed(socketId: string, reason: RoomClosedReason) {
    this.closed.set(socketId, reason);
  }

  /**
   * Reads the latest match update a player received.
   *
   * @param socketId - Player socket.
   * @returns The latest update, or undefined when none arrived.
   */
  lastGame(socketId: string) {
    return this.games.get(socketId)?.at(-1);
  }

  /**
   * Reads the latest room view a socket received.
   *
   * @param socketId - Player or spectator socket.
   * @returns The latest room view, or undefined when none arrived.
   */
  lastRoom(socketId: string) {
    return this.rooms.get(socketId)?.at(-1);
  }
}
