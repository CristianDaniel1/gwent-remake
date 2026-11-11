import type { PlayerId } from '@gwent/engine';
import type { RoomView } from '@gwent/shared';
import type { Room, Seat } from '../interfaces/room.interfaces';

/**
 * Converts a seat into what the other sockets may see of it.
 *
 * @param seat - Seat, or null when it is empty.
 * @returns The public seat data, or null for an empty seat.
 */
const toSeatView = (seat: Seat | null) =>
  seat && {
    name: seat.name,
    connected: seat.socketId !== null,
    wantsRematch: seat.wantsRematch,
  };

/**
 * Builds the room as one socket sees it.
 *
 * @param room - Room in memory.
 * @param you - Seat of the socket, or null for a spectator.
 * @returns The room view sent to that socket.
 */
export const toRoomView = (room: Room, you: PlayerId | null): RoomView => ({
  code: room.code,
  you,
  status: room.status,
  seats: { p1: toSeatView(room.seats.p1), p2: toSeatView(room.seats.p2) },
  spectators: room.spectators.size,
});
