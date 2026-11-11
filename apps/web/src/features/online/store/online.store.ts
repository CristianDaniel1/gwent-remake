import { opponentOf, type GameAction } from '@gwent/engine';
import type { Ack, JoinedRoom, RoomView } from '@gwent/shared';
import { io } from 'socket.io-client';
import { create } from 'zustand';
import { useGameStore } from '@/features/game';
import { reportError } from '@/shared/lib/report-error';
import { LIVE_ROOMS_TIMEOUT_MS, MOVE_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from '../constants/online';
import type { GameSocket, OnlineState } from '../interfaces/online';
import { phaseOf, roomEntry } from '../lib/room';
import { readSeatToken, saveSeatToken } from '../lib/seat-token';

let socket: GameSocket | null = null;

/** Store of the multiplayer connection, room and watched match. */
export const useOnlineStore = create<OnlineState>()((set, get) => {
  const enterRoom = ({ token, room }: JoinedRoom) => {
    saveSeatToken(token);
    set({ room, phase: phaseOf(room), error: null, closedReason: null });
  };

  const sendMove = async (action: GameAction): Promise<boolean> => {
    if (!socket) return false;
    try {
      const response = await socket.timeout(MOVE_TIMEOUT_MS).emitWithAck('game:action', { action });
      if (!response.ok) console.warn('Move rejected by the server', response.error);
      return response.ok;
    } catch (error) {
      reportError('online: send move', error);
      return false;
    }
  };

  const connect = (): GameSocket => {
    if (socket) return socket;
    socket = io({ transports: ['websocket'] });
    socket.on('room:joined', enterRoom);
    socket.on('room:update', (room) => set({ room, phase: phaseOf(room) }));
    socket.on('game:update', (update) => {
      const opponentName = get().room?.seats[opponentOf(update.you)]?.name ?? '';
      useGameStore.getState().receiveOnline(update, { opponentName, send: sendMove });
    });
    socket.on('spectate:update', (update) =>
      set((current) => ({ watched: { ...update, seq: (current.watched?.seq ?? 0) + 1 } })),
    );
    socket.on('room:closed', (reason) => {
      saveSeatToken(null);
      set({ phase: 'closed', closedReason: reason });
    });
    socket.io.on('reconnect', () => void get().resume());
    socket.on('connect_error', () => {
      if (get().phase === 'connecting') set({ phase: 'idle', error: 'CONNECTION' });
    });
    return socket;
  };

  const request = async <T>(
    run: (connection: GameSocket) => Promise<Ack<T>>,
  ): Promise<T | null> => {
    set({ phase: 'connecting', error: null, closedReason: null });
    try {
      const response = await run(connect());
      if (response.ok) return response.data;
      set({ phase: 'idle', error: response.error });
    } catch (error) {
      reportError('online: request', error);
      set({ phase: 'idle', error: 'CONNECTION' });
    }
    return null;
  };

  return {
    phase: 'idle',
    room: null,
    error: null,
    closedReason: null,
    watched: null,

    createRoom: async (name, deck, profileId) => {
      const joined = await request<JoinedRoom>((connection) =>
        connection
          .timeout(REQUEST_TIMEOUT_MS)
          .emitWithAck('room:create', roomEntry(name, deck, profileId)),
      );
      if (joined) enterRoom(joined);
    },

    joinRoom: async (code, name, deck, profileId) => {
      const joined = await request<JoinedRoom>((connection) =>
        connection
          .timeout(REQUEST_TIMEOUT_MS)
          .emitWithAck('room:join', { code, ...roomEntry(name, deck, profileId) }),
      );
      if (joined) enterRoom(joined);
    },

    quickMatch: async (name, deck, profileId) => {
      const queued = await request<{ waiting: number }>((connection) =>
        connection
          .timeout(REQUEST_TIMEOUT_MS)
          .emitWithAck('queue:join', roomEntry(name, deck, profileId)),
      );
      if (queued && get().phase === 'connecting') set({ phase: 'searching' });
    },

    cancelSearch: () => {
      socket?.emit('queue:leave');
      set({ phase: 'idle' });
    },

    rematch: () => {
      socket?.emit('room:rematch');
    },

    leave: () => {
      socket?.emit('room:leave');
      saveSeatToken(null);
      set({ phase: 'idle', room: null, error: null, closedReason: null, watched: null });
    },

    resume: async () => {
      const token = readSeatToken();
      if (!token) return false;
      try {
        const response = await connect()
          .timeout(REQUEST_TIMEOUT_MS)
          .emitWithAck('session:resume', { token });
        if (response.ok) {
          enterRoom(response.data);
          return true;
        }
      } catch (error) {
        reportError('online: resume', error);
      }
      saveSeatToken(null);
      return false;
    },

    watch: async (code) => {
      set({ watched: null });
      const watching = await request<{ room: RoomView }>((connection) =>
        connection.timeout(REQUEST_TIMEOUT_MS).emitWithAck('room:watch', { code }),
      );
      if (watching)
        set({ room: watching.room, phase: 'watching', error: null, closedReason: null });
    },

    liveRooms: async () => {
      try {
        const response = await connect().timeout(LIVE_ROOMS_TIMEOUT_MS).emitWithAck('rooms:live');
        return response.ok ? response.data : [];
      } catch (error) {
        reportError('online: live rooms', error);
        return [];
      }
    },
  };
});
