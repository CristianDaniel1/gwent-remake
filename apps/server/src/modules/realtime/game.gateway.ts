import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayDisconnect,
  type OnGatewayInit,
} from '@nestjs/websockets';
import type { GameAction } from '@gwent/engine';
import {
  EnterRoomSchema,
  GameActionMessageSchema,
  JoinRoomSchema,
  ResumeSessionSchema,
  WatchRoomSchema,
  type Ack,
  type GameUpdate,
  type JoinedRoom,
  type LiveRoom,
  type RoomClosedReason,
  type RoomView,
  type SpectatorUpdate,
} from '@gwent/shared';
import type { z } from 'zod';
import { describeError } from '../../common/helpers/describe-error';
import { RealtimeError } from './errors/realtime.error';
import { RateLimiter } from './helpers/rate-limiter';
import type { GameServer, GameSocket } from './interfaces/game-socket.interface';
import type { RoomNotifier } from './interfaces/room-notifier.interface';
import { RoomsService } from './rooms.service';

/**
 * Multiplayer entry point: rate-limits and validates each message with the @gwent/shared schemas
 * and forwards it to the RoomsService. The value a handler returns becomes the client's "ack".
 */
@WebSocketGateway()
export class GameGateway implements OnGatewayInit, OnGatewayDisconnect, RoomNotifier {
  private readonly logger = new Logger(GameGateway.name);
  private readonly limiter = new RateLimiter();

  @WebSocketServer()
  private readonly server!: GameServer;

  constructor(private readonly rooms: RoomsService) {}

  /** Registers the gateway as the way the rooms talk to the players. */
  afterInit() {
    this.rooms.setNotifier(this);
  }

  /**
   * Frees the client's rate limit and starts the reconnection wait of its seat.
   *
   * @param client - Socket that disconnected.
   */
  handleDisconnect(client: GameSocket) {
    this.limiter.forget(client.id);
    this.rooms.disconnect(client.id);
  }

  /**
   * Creates a room and seats the client as p1.
   *
   * @param client - Socket that sent the message.
   * @param body - Player name, deck and optional profile id.
   * @returns The session token and the room, or an error code.
   */
  @SubscribeMessage('room:create')
  createRoom(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<JoinedRoom> {
    return this.handle(client, EnterRoomSchema, body, (request) =>
      this.rooms.create(client.id, request),
    );
  }

  /**
   * Seats the client as p2 in a room and starts the match.
   *
   * @param client - Socket that sent the message.
   * @param body - Room code, player name, deck and optional profile id.
   * @returns The session token and the room, or an error code.
   */
  @SubscribeMessage('room:join')
  joinRoom(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<JoinedRoom> {
    return this.handle(client, JoinRoomSchema, body, (request) =>
      this.rooms.join(client.id, request),
    );
  }

  /**
   * Enters the quick match queue, pairing the client with whoever is waiting.
   *
   * @param client - Socket that sent the message.
   * @param body - Player name, deck and optional profile id.
   * @returns 0 when the client waits, 1 when it was paired, or an error code.
   */
  @SubscribeMessage('queue:join')
  joinQueue(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Ack<{ waiting: number }> {
    return this.handle(client, EnterRoomSchema, body, (request) =>
      this.rooms.enqueue(client.id, request),
    );
  }

  /**
   * Leaves the quick match queue.
   *
   * @param client - Socket that sent the message.
   */
  @SubscribeMessage('queue:leave')
  leaveQueue(@ConnectedSocket() client: GameSocket) {
    this.runCommand(client, () => this.rooms.dequeue(client.id));
  }

  /**
   * Takes the seat back after a dropped connection or a reloaded page.
   *
   * @param client - Socket that sent the message.
   * @param body - Session token.
   * @returns The session token and the room, or an error code.
   */
  @SubscribeMessage('session:resume')
  resumeSession(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Ack<JoinedRoom> {
    return this.handle(client, ResumeSessionSchema, body, ({ token }) =>
      this.rooms.resume(client.id, token),
    );
  }

  /**
   * Plays an action in the client's match.
   *
   * @param client - Socket that sent the message.
   * @param body - Engine action.
   * @returns An empty success, or an error code when the action is illegal.
   */
  @SubscribeMessage('game:action')
  playAction(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<null> {
    return this.handle(client, GameActionMessageSchema, body, ({ action }) => {
      this.rooms.act(client.id, action as GameAction);
      return null;
    });
  }

  /**
   * Asks for a rematch; the new match starts when both players asked.
   *
   * @param client - Socket that sent the message.
   */
  @SubscribeMessage('room:rematch')
  requestRematch(@ConnectedSocket() client: GameSocket) {
    this.runCommand(client, () => this.rooms.rematch(client.id));
  }

  /**
   * Watches a room as a spectator.
   *
   * @param client - Socket that sent the message.
   * @param body - Room code.
   * @returns The room, or an error code.
   */
  @SubscribeMessage('room:watch')
  watchRoom(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Ack<{ room: RoomView }> {
    return this.handle(client, WatchRoomSchema, body, ({ code }) =>
      this.rooms.watch(client.id, code),
    );
  }

  /**
   * Lists the matches being played now, for the lobby.
   *
   * @param client - Socket that sent the message.
   * @returns The live rooms, or an error code when rate-limited.
   */
  @SubscribeMessage('rooms:live')
  listLiveRooms(@ConnectedSocket() client: GameSocket): Ack<LiveRoom[]> {
    if (!this.limiter.take(client.id)) return { ok: false, error: 'RATE_LIMITED' };
    return { ok: true, data: this.rooms.liveRooms() };
  }

  /**
   * Leaves the current room (closing it for the opponent) or stops watching it.
   *
   * @param client - Socket that sent the message.
   */
  @SubscribeMessage('room:leave')
  leaveRoom(@ConnectedSocket() client: GameSocket) {
    this.runCommand(client, () => this.rooms.leave(client.id));
  }

  /**
   * Tells a player they took a seat (used by the quick match).
   *
   * @param socketId - Player socket.
   * @param joined - Session token and room.
   */
  joined(socketId: string, joined: JoinedRoom) {
    this.server.to(socketId).emit('room:joined', joined);
  }

  /**
   * Sends the room view (seats, status, spectators).
   *
   * @param socketId - Player or spectator socket.
   * @param room - Room as that socket sees it.
   */
  roomUpdate(socketId: string, room: RoomView) {
    this.server.to(socketId).emit('room:update', room);
  }

  /**
   * Sends a player the match state they can see and the latest events.
   *
   * @param socketId - Player socket.
   * @param update - Projected state and events.
   */
  gameUpdate(socketId: string, update: GameUpdate) {
    this.server.to(socketId).emit('game:update', update);
  }

  /**
   * Sends a spectator the match state without any hand.
   *
   * @param socketId - Spectator socket.
   * @param update - Projected state and events.
   */
  spectatorUpdate(socketId: string, update: SpectatorUpdate) {
    this.server.to(socketId).emit('spectate:update', update);
  }

  /**
   * Tells a socket the room was closed.
   *
   * @param socketId - Player or spectator socket.
   * @param reason - Why the room was closed.
   */
  roomClosed(socketId: string, reason: RoomClosedReason) {
    this.server.to(socketId).emit('room:closed', reason);
  }

  /**
   * Runs a message that has a body: rate limit, validation and error handling.
   *
   * @param client - Socket that sent the message.
   * @param schema - Schema of the message body.
   * @param body - Raw message body.
   * @param run - Service call with the validated body.
   * @returns The service result, or the error code to send back.
   */
  private handle<S extends z.ZodType, T>(
    client: GameSocket,
    schema: S,
    body: unknown,
    run: (request: z.infer<S>) => T,
  ): Ack<T> {
    if (!this.limiter.take(client.id)) return { ok: false, error: 'RATE_LIMITED' };
    const parsed = schema.safeParse(body);
    if (!parsed.success) return { ok: false, error: 'INVALID_MESSAGE' };
    try {
      return { ok: true, data: run(parsed.data) };
    } catch (error) {
      if (error instanceof RealtimeError) return { ok: false, error: error.code };
      this.logger.error('Message failed', describeError(error));
      return { ok: false, error: 'INVALID_MESSAGE' };
    }
  }

  /**
   * Runs a message without a body or answer: rate limit and error handling. A rejected command
   * (for example a rematch outside a room) is ignored.
   *
   * @param client - Socket that sent the message.
   * @param run - Service call.
   */
  private runCommand(client: GameSocket, run: () => void): void {
    if (!this.limiter.take(client.id)) return;
    try {
      run();
    } catch (error) {
      if (!(error instanceof RealtimeError)) {
        this.logger.error('Message failed', describeError(error));
      }
    }
  }
}
