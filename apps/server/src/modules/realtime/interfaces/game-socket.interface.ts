import type { ClientToServerEvents, ServerToClientEvents } from '@gwent/shared';
import type { Server, Socket } from 'socket.io';

/** Socket of one client, typed with the events shared with the frontend. */
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Socket.IO server, typed with the events shared with the frontend. */
export type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
