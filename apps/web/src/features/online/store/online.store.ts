import { opponentOf, type DeckList, type GameAction } from '@gwent/engine';
import type {
  ClientToServerEvents,
  JoinedRoom,
  LiveRoom,
  RealtimeErrorCode,
  RoomClosedReason,
  RoomView,
  ServerToClientEvents,
  SpectatorUpdate,
} from '@gwent/shared';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useGameStore } from '@/features/game';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type OnlinePhase =
  'idle' | 'connecting' | 'searching' | 'waiting' | 'playing' | 'watching' | 'closed';
export type OnlineError = RealtimeErrorCode | 'CONNECTION';

interface OnlineState {
  phase: OnlinePhase;
  room: RoomView | null;
  error: OnlineError | null;
  closedReason: RoomClosedReason | null;
  /** Latest view of the match being watched (numbered, to play each move's sounds once). */
  watched: (SpectatorUpdate & { seq: number }) | null;
  /** `profileId`: server profile, so the finished match goes to its history. */
  createRoom(name: string, deck: DeckList, profileId?: string): Promise<void>;
  joinRoom(code: string, name: string, deck: DeckList, profileId?: string): Promise<void>;
  quickMatch(name: string, deck: DeckList, profileId?: string): Promise<void>;
  cancelSearch(): void;
  rematch(): void;
  /** Leaves the room (the opponent is notified). */
  leave(): void;
  /** Gets back into the room after reloading the page or losing the connection. */
  resume(): Promise<boolean>;
  /** Watches a room as a spectator (no hand is visible). */
  watch(code: string): Promise<void>;
  /** Matches being played now (empty when the server cannot be reached). */
  liveRooms(): Promise<LiveRoom[]>;
}

/** Room seat token, per tab (two tabs can be the two players). */
const TOKEN_KEY = 'gwent:online-token';
const token = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (value: string | null) => {
    try {
      if (value) sessionStorage.setItem(TOKEN_KEY, value);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      // storage unavailable: reconnecting just will not work
    }
  },
};

let socket: GameSocket | null = null;

/** Room entry message (the profile is optional: without it the match is not recorded). */
const entry = (name: string, deck: DeckList, profileId?: string) => ({
  name,
  deck,
  ...(profileId ? { profileId } : {}),
});

export const useOnlineStore = create<OnlineState>()((set, get) => {
  const phaseOf = (room: RoomView): OnlinePhase =>
    room.you === null ? 'watching' : room.status === 'waiting' ? 'waiting' : 'playing';

  const enterRoom = ({ token: value, room }: JoinedRoom) => {
    token.set(value);
    set({ room, phase: phaseOf(room), error: null, closedReason: null });
  };

  const send = async (action: GameAction): Promise<boolean> => {
    if (!socket) return false;
    const ack = await socket
      .timeout(10_000)
      .emitWithAck('game:action', { action })
      .catch(() => ({ ok: false as const, error: 'CONNECTION' as const }));
    if (!ack.ok) console.warn('Move rejected by the server', ack.error);
    return ack.ok;
  };

  /** Connects once and wires the server events to the stores. */
  const connect = (): GameSocket => {
    if (socket) return socket;
    socket = io({ transports: ['websocket'] });
    socket.on('room:joined', enterRoom);
    socket.on('room:update', (room) => set({ room, phase: phaseOf(room) }));
    socket.on('game:update', (update) => {
      const room = get().room;
      const opponentName = room?.seats[opponentOf(update.you)]?.name ?? '';
      useGameStore.getState().receiveOnline(update, { opponentName, send });
    });
    socket.on('spectate:update', (update) =>
      set((s) => ({ watched: { ...update, seq: (s.watched?.seq ?? 0) + 1 } })),
    );
    socket.on('room:closed', (reason) => {
      token.set(null);
      set({ phase: 'closed', closedReason: reason });
    });
    // Connection is back (Socket.IO reconnects on its own): resume the room seat
    socket.io.on('reconnect', () => void get().resume());
    socket.on('connect_error', () => {
      if (get().phase === 'connecting') set({ phase: 'idle', error: 'CONNECTION' });
    });
    return socket;
  };

  /** Sends a join request and handles the answer. */
  const request = async (
    run: (s: GameSocket) => Promise<{ ok: boolean; error?: RealtimeErrorCode }>,
  ) => {
    set({ phase: 'connecting', error: null, closedReason: null });
    const ack = await run(connect()).catch(() => ({
      ok: false as const,
      error: 'CONNECTION' as const,
    }));
    if (!ack.ok) set({ phase: 'idle', error: ack.error ?? 'CONNECTION' });
    return ack;
  };

  return {
    phase: 'idle',
    room: null,
    error: null,
    closedReason: null,
    watched: null,

    createRoom: async (name, deck, profileId) => {
      const ack = await request((s) =>
        s.timeout(8000).emitWithAck('room:create', entry(name, deck, profileId)),
      );
      if (ack.ok && 'data' in ack) enterRoom(ack.data as JoinedRoom);
    },

    joinRoom: async (code, name, deck, profileId) => {
      const ack = await request((s) =>
        s.timeout(8000).emitWithAck('room:join', { code, ...entry(name, deck, profileId) }),
      );
      if (ack.ok && 'data' in ack) enterRoom(ack.data as JoinedRoom);
    },

    quickMatch: async (name, deck, profileId) => {
      const ack = await request((s) =>
        s.timeout(8000).emitWithAck('queue:join', entry(name, deck, profileId)),
      );
      // Paired right away: 'room:joined' already arrived; otherwise, wait in the queue
      if (ack.ok && get().phase === 'connecting') set({ phase: 'searching' });
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
      token.set(null);
      set({ phase: 'idle', room: null, error: null, closedReason: null, watched: null });
    },

    resume: async () => {
      const saved = token.get();
      if (!saved) return false;
      const ack = await connect()
        .timeout(8000)
        .emitWithAck('session:resume', { token: saved })
        .catch(() => null);
      if (!ack?.ok) {
        token.set(null);
        return false;
      }
      enterRoom(ack.data);
      return true;
    },

    watch: async (code) => {
      set({ watched: null });
      const ack = await request((s) => s.timeout(8000).emitWithAck('room:watch', { code }));
      if (ack.ok && 'data' in ack) {
        const { room } = ack.data as { room: RoomView };
        set({ room, phase: 'watching', error: null, closedReason: null });
      }
    },

    liveRooms: async () => {
      const ack = await connect()
        .timeout(5000)
        .emitWithAck('rooms:live')
        .catch(() => null);
      return ack?.ok ? ack.data : [];
    },
  };
});
