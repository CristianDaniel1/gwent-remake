import type {
  GameUpdate,
  JoinedRoom,
  RoomClosedReason,
  RoomView,
  SpectatorUpdate,
} from '@gwent/shared';

/** How the rooms talk to the players (implemented by the Socket.IO gateway). */
export interface RoomNotifier {
  joined(socketId: string, joined: JoinedRoom): void;
  roomUpdate(socketId: string, room: RoomView): void;
  gameUpdate(socketId: string, update: GameUpdate): void;
  spectatorUpdate(socketId: string, update: SpectatorUpdate): void;
  roomClosed(socketId: string, reason: RoomClosedReason): void;
}
