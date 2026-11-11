import { Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getLegalActions, randomFrom } from '@gwent/engine';
import type {
  ClientToServerEvents,
  GameUpdate,
  RoomClosedReason,
  ServerToClientEvents,
} from '@gwent/shared';
import { io, type Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RATE_LIMIT_BURST } from '../src/modules/realtime/constants/realtime.constants';
import { MatchesModule } from '../src/modules/matches/matches.module';
import { MatchesService } from '../src/modules/matches/matches.service';
import { RealtimeModule } from '../src/modules/realtime/realtime.module';
import { TEST_DECKS } from './constants/test.constants';

const WAIT_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 10;
const MAX_STEPS = 2000;

/** No database here: finished matches are not recorded. */
@Module({
  providers: [{ provide: MatchesService, useValue: { recordOnline: () => Promise.resolve() } }],
  exports: [MatchesService],
})
class NoDatabaseMatchesModule {}

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Waits until a condition holds, polling it.
 *
 * @param check - Condition to wait for.
 * @throws Error - When the condition does not hold within WAIT_TIMEOUT_MS.
 */
const waitUntil = async (check: () => boolean) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > WAIT_TIMEOUT_MS) throw new Error('timed out waiting for the server');
    await sleep(POLL_INTERVAL_MS);
  }
};

describe('multiplayer over Socket.IO (e2e, no database)', () => {
  let app: INestApplication;
  let url: string;
  const sockets: Client[] = [];

  /**
   * Connects a client that keeps the latest view of the match.
   *
   * @returns The socket and what it has seen so far.
   */
  const connectPlayer = () => {
    const socket: Client = io(url, { transports: ['websocket'], forceNew: true });
    sockets.push(socket);
    const seen = { update: null as GameUpdate | null, closed: null as RoomClosedReason | null };
    socket.on('game:update', (update) => (seen.update = update));
    socket.on('room:closed', (reason) => (seen.closed = reason));
    return { socket, seen };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [RealtimeModule] })
      .overrideModule(MatchesModule)
      .useModule(NoDatabaseMatchesModule)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0);
    url = await app.getUrl();
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.disconnect();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lets two clients create/join a room (code in lowercase) and play a whole match', async () => {
    const host = connectPlayer();
    const guest = connectPlayer();

    const created = await host.socket.emitWithAck('room:create', {
      name: 'Geralt',
      deck: TEST_DECKS.p1,
    });
    if (!created.ok) throw new Error(created.error);
    const joined = await guest.socket.emitWithAck('room:join', {
      name: 'Ciri',
      deck: TEST_DECKS.p2,
      code: created.data.room.code.toLowerCase(),
    });
    expect(joined.ok).toBe(true);

    const random = randomFrom({ state: 3 });
    const players = [
      { id: 'p1' as const, ...host },
      { id: 'p2' as const, ...guest },
    ];
    await waitUntil(() => !!host.seen.update && !!guest.seen.update);
    for (let step = 0; step < MAX_STEPS; step++) {
      if (host.seen.update?.state.phase === 'gameOver') break;
      const mover = players.find(
        (player) =>
          player.seen.update && getLegalActions(player.seen.update.state, player.id).length > 0,
      );
      const before = mover?.seen.update;
      if (!mover || !before) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      const legal = getLegalActions(before.state, mover.id);
      const action = legal[random.int(legal.length)];
      if (!action) continue;
      const ack = await mover.socket.emitWithAck('game:action', { action });
      expect(ack).toEqual({ ok: true, data: null });
      await waitUntil(() => mover.seen.update !== before);
    }

    await waitUntil(() => guest.seen.update?.state.phase === 'gameOver');
    expect(host.seen.update?.state.phase).toBe('gameOver');
    expect(guest.seen.update?.state.result).toBe(host.seen.update?.state.result);
  });

  it('tells the other player when someone leaves the room', async () => {
    const host = connectPlayer();
    const guest = connectPlayer();
    const created = await host.socket.emitWithAck('room:create', {
      name: 'Geralt',
      deck: TEST_DECKS.p1,
    });
    if (!created.ok) throw new Error(created.error);
    await guest.socket.emitWithAck('room:join', {
      name: 'Ciri',
      deck: TEST_DECKS.p2,
      code: created.data.room.code,
    });

    host.socket.emit('room:leave');
    await waitUntil(() => guest.seen.closed !== null);
    expect(guest.seen.closed).toBe('opponentLeft');
  });

  it('rejects invalid messages and actions outside a room', async () => {
    const { socket } = connectPlayer();
    const joinAck = await socket.emitWithAck('room:join', { name: '', deck: {} } as never);
    expect(joinAck).toEqual({ ok: false, error: 'INVALID_MESSAGE' });
    const actionAck = await socket.emitWithAck('game:action', {
      action: { type: 'PASS', player: 'p1' },
    });
    expect(actionAck).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
  });

  it('ignores a rematch outside a room and keeps the connection working', async () => {
    const { socket } = connectPlayer();
    socket.emit('room:rematch');
    const liveAck = await socket.emitWithAck('rooms:live');
    expect(liveAck).toMatchObject({ ok: true });
  });

  it('answers RATE_LIMITED when a client sends too many messages at once', async () => {
    const { socket } = connectPlayer();
    const acks = await Promise.all(
      Array.from({ length: RATE_LIMIT_BURST + 5 }, () => socket.emitWithAck('rooms:live')),
    );
    expect(acks).toContainEqual({ ok: false, error: 'RATE_LIMITED' });
  });
});
