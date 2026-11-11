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
import type { EnterRoom, JoinedRoom, LiveRoom, RoomClosedReason, RoomView } from '@gwent/shared';
import { describeError } from '../../common/helpers/describe-error';
import { MATCH_RECORDER } from '../matches/constants/matches.constants';
import type { MatchRecorder } from '../matches/interfaces/match-recorder.interface';
import { MAX_MATCH_SEED, REALTIME_OPTIONS } from './constants/realtime.constants';
import { RealtimeError } from './errors/realtime.error';
import { randomRoomCode } from './helpers/room-code';
import { toRoomView } from './helpers/room-view';
import { timeoutAction, waitingFor } from './helpers/turns';
import type { RealtimeOptions } from './interfaces/realtime-options.interface';
import type { RoomNotifier } from './interfaces/room-notifier.interface';
import type { QueuedPlayer, Room, SeatLocation } from './interfaces/room.interfaces';

/**
 * Multiplayer rooms, in memory. The server is the authority: it keeps the full state,
 * validates each action with the engine and sends each player only what they can see.
 */
@Injectable()
export class RoomsService implements OnModuleDestroy {
  private readonly logger = new Logger(RoomsService.name);
  private readonly rooms = new Map<string, Room>();
  /** token → seat (to reconnect) */
  private readonly seatsByToken = new Map<string, SeatLocation>();
  /** socket → token (to find the room of whoever sent the message) */
  private readonly tokensBySocket = new Map<string, string>();
  /** spectator socket → room code */
  private readonly watching = new Map<string, string>();
  private queue: QueuedPlayer[] = [];
  private notifier: RoomNotifier | null = null;

  constructor(
    @Inject(REALTIME_OPTIONS) private readonly options: RealtimeOptions,
    @Optional() @Inject(MATCH_RECORDER) private readonly recorder: MatchRecorder | null = null,
  ) {}

  /**
   * Sets how the service talks to the players.
   *
   * @param notifier - Sender of the messages (the gateway).
   */
  setNotifier(notifier: RoomNotifier) {
    this.notifier = notifier;
  }

  /** Clears every room timer when the application stops. */
  onModuleDestroy() {
    for (const room of this.rooms.values()) this.clearTimers(room);
  }

  /**
   * Creates a room and seats the player as p1.
   *
   * @param socketId - Player socket.
   * @param request - Player name, deck and optional profile id.
   * @returns The session token and the room.
   * @throws RealtimeError - ALREADY_IN_ROOM or INVALID_DECK.
   */
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

  /**
   * Seats the player as p2 and starts the match.
   *
   * @param socketId - Player socket.
   * @param request - Room code, player name, deck and optional profile id.
   * @returns The session token and the room.
   * @throws RealtimeError - ALREADY_IN_ROOM, INVALID_DECK, ROOM_NOT_FOUND or ROOM_FULL.
   */
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

  /**
   * Quick match: the first player waits; the second is paired with them in a new room.
   *
   * @param socketId - Player socket.
   * @param request - Player name, deck and optional profile id.
   * @returns 0 when the player waits, 1 when they were paired.
   * @throws RealtimeError - ALREADY_IN_ROOM or INVALID_DECK.
   */
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

  /**
   * Removes the player from the quick match queue.
   *
   * @param socketId - Player socket.
   */
  dequeue(socketId: string) {
    this.queue = this.queue.filter((queued) => queued.socketId !== socketId);
  }

  /**
   * Gives the seat back to a player who reconnected (dropped connection or reloaded page).
   *
   * @param socketId - New player socket.
   * @param token - Session token received when the player took the seat.
   * @returns The session token and the room.
   * @throws RealtimeError - SESSION_NOT_FOUND when the token or the room no longer exists.
   */
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
    return { token, room: toRoomView(room, place.player) };
  }

  /**
   * Watches a room as a spectator: receives the match without any hand.
   *
   * @param socketId - Spectator socket.
   * @param code - Room code.
   * @returns The room as a spectator sees it.
   * @throws RealtimeError - ALREADY_IN_ROOM or ROOM_NOT_FOUND.
   */
  watch(socketId: string, code: string): { room: RoomView } {
    this.assertFree(socketId);
    const room = this.rooms.get(code);
    if (!room) throw new RealtimeError('ROOM_NOT_FOUND');
    this.stopWatching(socketId);
    room.spectators.add(socketId);
    this.watching.set(socketId, code);
    this.broadcastRoom(room);
    if (room.state) this.sendSpectator(socketId, room.state, []);
    return { room: toRoomView(room, null) };
  }

  /**
   * Lists the matches being played now (both seats taken), for the lobby.
   *
   * @returns The live rooms.
   */
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

  /**
   * Plays an action of the player in their match.
   *
   * @param socketId - Player socket.
   * @param action - Engine action.
   * @throws RealtimeError - NOT_IN_ROOM, or ILLEGAL_ACTION when the engine rejects the action.
   */
  act(socketId: string, action: GameAction): void {
    const { room, player } = this.locate(socketId);
    if (!room.state || action.player !== player) throw new RealtimeError('ILLEGAL_ACTION');
    this.apply(room, action);
  }

  /**
   * Records that the player wants a rematch; starts it when both players want one.
   *
   * @param socketId - Player socket.
   * @throws RealtimeError - NOT_IN_ROOM.
   */
  rematch(socketId: string): void {
    const { room, player } = this.locate(socketId);
    const seat = room.seats[player];
    if (room.status !== 'finished' || !seat) return;
    seat.wantsRematch = true;
    if (PLAYER_IDS.every((playerId) => room.seats[playerId]?.wantsRematch)) this.startGame(room);
    else this.broadcastRoom(room);
  }

  /**
   * Leaves the queue, stops watching or closes the player's room for the opponent.
   *
   * @param socketId - Player or spectator socket.
   */
  leave(socketId: string): void {
    this.dequeue(socketId);
    if (this.stopWatching(socketId)) return;
    const token = this.tokensBySocket.get(socketId);
    const place = token && this.seatsByToken.get(token);
    if (!place) return;
    const room = this.rooms.get(place.code);
    if (room) this.close(room, 'opponentLeft');
  }

  /**
   * Handles a dropped connection: waits a while for the reconnection before closing the room.
   *
   * @param socketId - Socket that disconnected.
   */
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
      () => this.runSafely(room, () => this.close(room, 'opponentTimedOut')),
      this.options.disconnectGraceMs,
    );
  }

  /** Rooms open right now (for tests and logs). */
  get openRooms(): number {
    return this.rooms.size;
  }

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
    return { token, room: toRoomView(room, player) };
  }

  private startGame(room: Room) {
    const { p1, p2 } = room.seats;
    if (!p1 || !p2) return;
    p1.wantsRematch = p2.wantsRematch = false;
    const seed = randomInt(MAX_MATCH_SEED);
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
    if (!room.state || !waitingFor(room.state).length) return;
    room.turnTimer = setTimeout(
      () => this.runSafely(room, () => this.playTimeoutActions(room)),
      this.options.turnTimeoutMs,
    );
  }

  private playTimeoutActions(room: Room) {
    if (!room.state) return;
    for (const player of waitingFor(room.state)) {
      const action = room.state && timeoutAction(room.state, player);
      if (action) this.apply(room, action);
    }
  }

  /**
   * Runs timer work, logging any error: an exception thrown inside a timer would stop the process.
   *
   * @param room - Room the work belongs to.
   * @param task - Work to run.
   */
  private runSafely(room: Room, task: () => void) {
    try {
      task();
    } catch (error) {
      this.logger.error(`Room ${room.code}: timer failed`, describeError(error));
    }
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
      if (socketId) this.notifier?.roomUpdate(socketId, toRoomView(room, player));
    }
    for (const socketId of room.spectators) {
      this.notifier?.roomUpdate(socketId, toRoomView(room, null));
    }
  }

  private locate(socketId: string): { room: Room; player: PlayerId } {
    const token = this.tokensBySocket.get(socketId);
    const place = token && this.seatsByToken.get(token);
    const room = place && this.rooms.get(place.code);
    if (!place || !room) throw new RealtimeError('NOT_IN_ROOM');
    return { room, player: place.player };
  }

  /** Fails when the socket already has a seat; a spectator who decides to play stops watching. */
  private assertFree(socketId: string) {
    if (this.tokensBySocket.has(socketId)) throw new RealtimeError('ALREADY_IN_ROOM');
    this.stopWatching(socketId);
  }

  private assertPlayable(deck: DeckList) {
    if (validateDeck(deck).length) throw new RealtimeError('INVALID_DECK');
  }

  /** Draws room codes until one is not in use. */
  private newCode(): string {
    let code = randomRoomCode();
    while (this.rooms.has(code)) code = randomRoomCode();
    return code;
  }
}
