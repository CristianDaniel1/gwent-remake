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
  type ClientToServerEvents,
  type GameUpdate,
  type JoinedRoom,
  type LiveRoom,
  type RoomClosedReason,
  type RoomView,
  type ServerToClientEvents,
  type SpectatorUpdate,
} from '@gwent/shared';
import type { Server, Socket } from 'socket.io';
import type { z } from 'zod';
import { RateLimiter } from './rate-limiter';
import { RealtimeError, RoomsService, type RoomNotifier } from './rooms.service';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/**
 * Multiplayer entry point. Thin on purpose: rate-limits, validates each message
 * with the @gwent/shared schemas and forwards it to the RoomsService (which holds the rules).
 * The value returned by each handler becomes the message "ack" on the client.
 */
@WebSocketGateway()
export class GameGateway implements OnGatewayInit, OnGatewayDisconnect, RoomNotifier {
  private readonly logger = new Logger(GameGateway.name);
  private readonly limiter = new RateLimiter();

  @WebSocketServer()
  private readonly server!: Server<ClientToServerEvents, ServerToClientEvents>;

  constructor(private readonly rooms: RoomsService) {}

  afterInit() {
    this.rooms.setNotifier(this);
  }

  handleDisconnect(client: GameSocket) {
    this.limiter.forget(client.id);
    this.rooms.disconnect(client.id);
  }

  @SubscribeMessage('room:create')
  create(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<JoinedRoom> {
    return this.handle(client, EnterRoomSchema, body, (request) =>
      this.rooms.create(client.id, request),
    );
  }

  @SubscribeMessage('room:join')
  join(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<JoinedRoom> {
    return this.handle(client, JoinRoomSchema, body, (request) =>
      this.rooms.join(client.id, request),
    );
  }

  @SubscribeMessage('queue:join')
  enqueue(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Ack<{ waiting: number }> {
    return this.handle(client, EnterRoomSchema, body, (request) =>
      this.rooms.enqueue(client.id, request),
    );
  }

  @SubscribeMessage('queue:leave')
  dequeue(@ConnectedSocket() client: GameSocket) {
    this.rooms.dequeue(client.id);
  }

  @SubscribeMessage('session:resume')
  resume(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<JoinedRoom> {
    return this.handle(client, ResumeSessionSchema, body, ({ token }) =>
      this.rooms.resume(client.id, token),
    );
  }

  @SubscribeMessage('game:action')
  act(@ConnectedSocket() client: GameSocket, @MessageBody() body: unknown): Ack<null> {
    return this.handle(client, GameActionMessageSchema, body, ({ action }) => {
      this.rooms.act(client.id, action as GameAction);
      return null;
    });
  }

  @SubscribeMessage('room:rematch')
  rematch(@ConnectedSocket() client: GameSocket) {
    if (this.limiter.take(client.id)) this.rooms.rematch(client.id);
  }

  @SubscribeMessage('room:watch')
  watch(
    @ConnectedSocket() client: GameSocket,
    @MessageBody() body: unknown,
  ): Ack<{ room: RoomView }> {
    return this.handle(client, WatchRoomSchema, body, ({ code }) =>
      this.rooms.watch(client.id, code),
    );
  }

  @SubscribeMessage('rooms:live')
  live(@ConnectedSocket() client: GameSocket): Ack<LiveRoom[]> {
    if (!this.limiter.take(client.id)) return { ok: false, error: 'RATE_LIMITED' };
    return { ok: true, data: this.rooms.liveRooms() };
  }

  @SubscribeMessage('room:leave')
  leave(@ConnectedSocket() client: GameSocket) {
    this.rooms.leave(client.id);
  }

  // --- RoomNotifier ---------------------------------------------------------

  joined(socketId: string, joined: JoinedRoom) {
    this.server.to(socketId).emit('room:joined', joined);
  }

  roomUpdate(socketId: string, room: RoomView) {
    this.server.to(socketId).emit('room:update', room);
  }

  gameUpdate(socketId: string, update: GameUpdate) {
    this.server.to(socketId).emit('game:update', update);
  }

  spectatorUpdate(socketId: string, update: SpectatorUpdate) {
    this.server.to(socketId).emit('spectate:update', update);
  }

  roomClosed(socketId: string, reason: RoomClosedReason) {
    this.server.to(socketId).emit('room:closed', reason);
  }

  // --- Internals -----------------------------------------------------------

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
      this.logger.error(error);
      return { ok: false, error: 'INVALID_MESSAGE' };
    }
  }
}
