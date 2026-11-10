import { randomInt, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional, type OnModuleDestroy } from '@nestjs/common';
import {
  applyAction,
  createGame,
  PLAYER_IDS,
  projectEvents,
  projectFor,
  validateDeck,
  type DeckList,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type EnterRoom,
  type GameUpdate,
  type JoinedRoom,
  type LiveRoom,
  type RealtimeErrorCode,
  type RoomClosedReason,
  type RoomStatus,
  type RoomView,
  type SpectatorUpdate,
} from '@gwent/shared';
import { MATCH_RECORDER, type MatchRecorder } from '../matches/match-recorder';
import { REALTIME_OPTIONS, type RealtimeOptions } from './realtime.options';
import { timeoutAction, waitingFor } from './turns';

/** How the service talks to the players (implemented by the Socket.IO gateway). */
export interface RoomNotifier {
  joined(socketId: string, joined: JoinedRoom): void;
  roomUpdate(socketId: string, room: RoomView): void;
  gameUpdate(socketId: string, update: GameUpdate): void;
  spectatorUpdate(socketId: string, update: SpectatorUpdate): void;
  roomClosed(socketId: string, reason: RoomClosedReason): void;
}

export class RealtimeError extends Error {
  constructor(readonly code: RealtimeErrorCode) {
    super(code);
  }
}

interface Seat {
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

interface Room {
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

interface Queued extends EnterRoom {
  socketId: string;
}

/**
 * Multiplayer rooms, in memory. The server is the authority: it keeps the full state,
 * validates each action with the engine and sends each player only what they can see.
 */
@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly logger = new Logger(RoomsService.name);
  private readonly rooms = new Map<string, Room>();
  /** token → seat (to reconnect) */
  private readonly seatsByToken = new Map<string, { code: string; player: PlayerId }>();
  /** socket → token (to find the room of whoever sent the message) */
  private readonly tokensBySocket = new Map<string, string>();
  /** spectator socket → room code */
  private readonly watching = new Map<string, string>();
  private queue: Queued[] = [];
  private notifier: RoomNotifier | null = null;

  constructor(
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeOptions,
    @Optional() @Inject(MATCH_RECORDER) private readonly recorder: MatchRecorder | null = null,
  ) {}

  setNotifier(notifier: RoomNotifier) {
    this.notifier = notifier;
  }

  onModuleDestroy() {
    for (const room of this.rooms.values()) this.clearTimers(room);
  }

  // --- Joining --------------------------------------------------------------

  create(socketId: string, request: EnterRoom): JoinedRoom {
    this.assertFree(socketId);
    this.assertPlayable(request.deck);
    const room: Room = {
      code: this.newCode(),
      seats: { p1: null, p2: null },
      status: 'waiting',
      state: null,
      seed: 0,
      actions: [],
      spectators: new Set(),
    };
    this.rooms.set(room.code, room);
    return this.seat(room, 'p1', socketId, request);
  }

  join(socketId: string, request: EnterRoom & { code: string }): JoinedRoom {
    this.assertFree(socketId);
    this.assertPlayable(request.deck);
    const room = this.rooms.get(request.code);
    if (!room) throw new RealtimeError('ROOM_NOT_FOUND');
    if (room.seats.p2) throw new RealtimeError('ROOM_FULL');
    const joined = this.seat(room, 'p2', socketId, request);
    this.startGame(room);
    return joined;
  }

  /** Quick match: the first player waits; the second is paired with them. */
  enqueue(socketId: string, request: EnterRoom): { waiting: number } {
    this.assertFree(socketId);
    this.assertPlayable(request.deck);
    this.dequeue(socketId);
    const partner = this.queue.shift();
    if (!partner) {
      this.queue.push({ ...request, socketId });
      return { waiting: 0 };
    }
    const host = this.create(partner.socketId, partner);
    this.notifier?.joined(partner.socketId, host);
    const guest = this.join(socketId, { ...request, code: host.room.code });
    this.notifier?.joined(socketId, guest);
    return { waiting: 1 };
  }

  dequeue(socketId: string) {
    this.queue = this.queue.filter((q) => q.socketId !== socketId);
  }

  /** Reconnects with the token (dropped connection or reloaded page). */
  resume(socketId: string, token: string): JoinedRoom {
    const place = this.seatsByToken.get(token);
    const room = place && this.rooms.get(place.code);
    const seat = place && room?.seats[place.player];
    if (!place || !room || !seat) throw new RealtimeError('SESSION_NOT_FOUND');
    if (seat.socketId) this.tokensBySocket.delete(seat.socketId);
    clearTimeout(seat.graceTimer);
    seat.socketId = socketId;
    this.logger.log(`Room ${room.code}: ${place.player} reconnected`);
    this.tokensBySocket.set(socketId, token);
    this.broadcastRoom(room);
    if (room.state) this.sendGame(room, place.player, []);
    return { token, room: this.view(room, place.player) };
  }

  // --- Watching -------------------------------------------------------------

  /** Watches a room as a spectator: receives the match without any hand. */
  watch(socketId: string, code: string): { room: RoomView } {
    this.assertFree(socketId);
    const room = this.rooms.get(code);
    if (!room) throw new RealtimeError('ROOM_NOT_FOUND');
    this.stopWatching(socketId);
    room.spectators.add(socketId);
    this.watching.set(socketId, code);
    this.broadcastRoom(room);
    if (room.state) this.sendSpectator(socketId, room.state, []);
    return { room: this.view(room, null) };
  }

  /** Matches being played now (both seats taken), for the lobby list. */
  liveRooms(): LiveRoom[] {
    return [...this.rooms.values()].flatMap((room) => {
      const { p1, p2 } = room.seats;
      if (room.status === 'waiting' || !p1 || !p2 || !room.state) return [];
      return [
        {
          code: room.code,
          names: { p1: p1.name, p2: p2.name },
          round: room.state.round,
          spectators: room.spectators.size,
        },
      ];
    });
  }

  // --- Playing --------------------------------------------------------------

  act(socketId: string, action: GameAction): void {
    const { room, player } = this.locate(socketId);
    if (!room.state || action.player !== player) throw new RealtimeError('ILLEGAL_ACTION');
    this.apply(room, action);
  }

  rematch(socketId: string): void {
    const { room, player } = this.locate(socketId);
    const seat = room.seats[player];
    if (room.status !== 'finished' || !seat) return;
    seat.wantsRematch = true;
    if (PLAYER_IDS.every((p) => room.seats[p]?.wantsRematch)) this.startGame(room);
    else this.broadcastRoom(room);
  }

  // --- Leaving --------------------------------------------------------------

  leave(socketId: string): void {
    this.dequeue(socketId);
    if (this.stopWatching(socketId)) return;
    const token = this.tokensBySocket.get(socketId);
    const place = token && this.seatsByToken.get(token);
    if (!place) return;
    const room = this.rooms.get(place.code);
    if (room) this.close(room, 'opponentLeft');
  }

  /** Dropped connection: waits a while for the reconnection before closing the room. */
  disconnect(socketId: string): void {
    this.dequeue(socketId);
    if (this.stopWatching(socketId)) return;
    const token = this.tokensBySocket.get(socketId);
    this.tokensBySocket.delete(socketId);
    const place = token ? this.seatsByToken.get(token) : undefined;
    const room = place ? this.rooms.get(place.code) : undefined;
    const seat = place ? room?.seats[place.player] : undefined;
    if (!room || !seat || seat.socketId !== socketId) return;
    seat.socketId = null;
    this.logger.log(`Room ${room.code}: ${seat.name} disconnected; waiting for reconnection`);
    this.broadcastRoom(room);
    seat.graceTimer = setTimeout(
      () => this.close(room, 'opponentTimedOut'),
      this.options.disconnectGraceMs,
    );
  }

  // --- Internals ------------------------------------------------------------

  private seat(room: Room, player: PlayerId, socketId: string, request: EnterRoom): JoinedRoom {
    const token = randomUUID();
    room.seats[player] = {
      token,
      name: request.name,
      deck: request.deck,
      profileId: request.profileId,
      socketId,
      wantsRematch: false,
    };
    this.seatsByToken.set(token, { code: room.code, player });
    this.tokensBySocket.set(socketId, token);
    this.broadcastRoom(room);
    return { token, room: this.view(room, player) };
  }

  private startGame(room: Room) {
    const { p1, p2 } = room.seats;
    if (!p1 || !p2) return;
    p1.wantsRematch = p2.wantsRematch = false;
    const seed = randomInt(2 ** 32 - 1);
    const { state, events } = createGame({ seed, decks: { p1: p1.deck, p2: p2.deck } });
    room.state = state;
    room.seed = seed;
    room.actions = [];
    room.status = 'playing';
    this.broadcastRoom(room);
    for (const player of PLAYER_IDS) this.sendGame(room, player, events);
    this.sendSpectators(room, events);
    this.scheduleTurnTimer(room);
  }

  private apply(room: Room, action: GameAction) {
    if (!room.state) return;
    const result = applyAction(room.state, action);
    if (!result.ok) {
      this.logger.warn(
        `Room ${room.code}: action rejected (${result.error.code}) ${JSON.stringify(action)}; ` +
          `phase ${room.state.phase}, turn of ${room.state.currentPlayer ?? '-'}`,
      );
      throw new RealtimeError('ILLEGAL_ACTION');
    }
    room.state = result.state;
    room.actions.push(action);
    for (const player of PLAYER_IDS) this.sendGame(room, player, result.events);
    this.sendSpectators(room, result.events);
    if (result.state.phase === 'gameOver') {
      room.status = 'finished';
      this.broadcastRoom(room);
      this.record(room);
    }
    this.scheduleTurnTimer(room);
  }

  /** Whoever takes too long gets the automatic move (redraw, choice or pass). */
  private scheduleTurnTimer(room: Room) {
    clearTimeout(room.turnTimer);
    if (!room.state || waitingFor(room.state).length === 0) return;
    room.turnTimer = setTimeout(() => {
      for (const player of waitingFor(room.state as GameState)) {
        const action = room.state && timeoutAction(room.state, player);
        if (action) this.apply(room, action);
      }
    }, this.options.turnTimeoutMs);
  }

  /** Sends the finished match to the players' history (in the background). */
  private record(room: Room) {
    const { p1, p2 } = room.seats;
    if (!this.recorder || !p1 || !p2) return;
    void this.recorder.recordOnline({
      seed: room.seed,
      decks: { p1: p1.deck, p2: p2.deck },
      actions: [...room.actions],
      players: {
        p1: { name: p1.name, profileId: p1.profileId },
        p2: { name: p2.name, profileId: p2.profileId },
      },
    });
  }

  private close(room: Room, reason: RoomClosedReason) {
    this.clearTimers(room);
    for (const player of PLAYER_IDS) {
      const seat = room.seats[player];
      if (!seat) continue;
      this.seatsByToken.delete(seat.token);
      if (seat.socketId) {
        this.tokensBySocket.delete(seat.socketId);
        this.notifier?.roomClosed(seat.socketId, reason);
      }
    }
    for (const socketId of room.spectators) {
      this.watching.delete(socketId);
      this.notifier?.roomClosed(socketId, reason);
    }
    this.rooms.delete(room.code);
    this.logger.log(`Room ${room.code} closed (${reason})`);
  }

  private clearTimers(room: Room) {
    clearTimeout(room.turnTimer);
    for (const player of PLAYER_IDS) clearTimeout(room.seats[player]?.graceTimer);
  }

  private sendGame(room: Room, player: PlayerId, events: GameEvent[]) {
    const socketId = room.seats[player]?.socketId;
    if (!socketId || !room.state) return;
    this.notifier?.gameUpdate(socketId, {
      you: player,
      state: projectFor(room.state, player),
      events: projectEvents(events, player),
    });
  }

  /** Removes a spectator; false when the socket was not watching. */
  private stopWatching(socketId: string): boolean {
    const code = this.watching.get(socketId);
    if (!code) return false;
    this.watching.delete(socketId);
    const room = this.rooms.get(code);
    if (room?.spectators.delete(socketId)) this.broadcastRoom(room);
    return true;
  }

  private sendSpectators(room: Room, events: GameEvent[]) {
    if (!room.state) return;
    for (const socketId of room.spectators) this.sendSpectator(socketId, room.state, events);
  }

  private sendSpectator(socketId: string, state: GameState, events: GameEvent[]) {
    this.notifier?.spectatorUpdate(socketId, {
      state: projectFor(state, null),
      events: projectEvents(events, null),
    });
  }

  private broadcastRoom(room: Room) {
    for (const player of PLAYER_IDS) {
      const socketId = room.seats[player]?.socketId;
      if (socketId) this.notifier?.roomUpdate(socketId, this.view(room, player));
    }
    for (const socketId of room.spectators) {
      this.notifier?.roomUpdate(socketId, this.view(room, null));
    }
  }

  private view(room: Room, you: PlayerId | null): RoomView {
    const seatView = (seat: Seat | null) =>
      seat && {
        name: seat.name,
        connected: seat.socketId !== null,
        wantsRematch: seat.wantsRematch,
      };
    return {
      code: room.code,
      you,
      status: room.status,
      seats: { p1: seatView(room.seats.p1), p2: seatView(room.seats.p2) },
      spectators: room.spectators.size,
    };
  }

  private locate(socketId: string): { room: Room; player: PlayerId } {
    const token = this.tokensBySocket.get(socketId);
    const place = token && this.seatsByToken.get(token);
    const room = place && this.rooms.get(place.code);
    if (!place || !room) throw new RealtimeError('NOT_IN_ROOM');
    return { room, player: place.player };
  }

  private assertFree(socketId: string) {
    if (this.tokensBySocket.has(socketId)) throw new RealtimeError('ALREADY_IN_ROOM');
    // A spectator who decides to play stops watching first
    this.stopWatching(socketId);
  }

  private assertPlayable(deck: DeckList) {
    if (validateDeck(deck).length > 0) throw new RealtimeError('INVALID_DECK');
  }

  private newCode(): string {
    for (;;) {
      const code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
      ).join('');
      if (!this.rooms.has(code)) return code;
    }
  }

  /** For tests and logs: rooms open right now. */
  get openRooms(): number {
    return this.rooms.size;
  }
}
