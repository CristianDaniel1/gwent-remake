import { Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getLegalActions, PREMADE_DECKS, randomFrom, type DeckList } from '@gwent/engine';
import type {
  ClientToServerEvents,
  GameUpdate,
  RoomClosedReason,
  ServerToClientEvents,
} from '@gwent/shared';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MatchesModule } from '../src/modules/matches/matches.module';
import { MatchesService } from '../src/modules/matches/matches.service';
import { RealtimeModule } from '../src/modules/realtime/realtime.module';

/** No database here: finished matches are not recorded. */
@Module({
  providers: [{ provide: MatchesService, useValue: { recordOnline: () => Promise.resolve() } }],
  exports: [MatchesService],
})
class NoDatabaseMatchesModule {}

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Client that keeps the latest view of the match. */
function player(url: string) {
  const socket: Client = io(url, { transports: ['websocket'], forceNew: true });
  const seen = { update: null as GameUpdate | null, closed: null as RoomClosedReason | null };
  socket.on('game:update', (update) => (seen.update = update));
  socket.on('room:closed', (reason) => (seen.closed = reason));
  return { socket, seen };
}

const until = async (check: () => boolean, ms = 5000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('timed out waiting for the server');
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('multiplayer over Socket.IO (e2e, no database)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [RealtimeModule] })
      .overrideModule(MatchesModule)
      .useModule(NoDatabaseMatchesModule)
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.listen(0);
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lets two clients create/join a room and play a whole match', async () => {
    const deck = PREMADE_DECKS[0] as DeckList;
    const a = player(url);
    const b = player(url);

    const created = await a.socket.emitWithAck('room:create', { name: 'Geralt', deck });
    if (!created.ok) throw new Error(created.error);
    const joined = await b.socket.emitWithAck('room:join', {
      name: 'Ciri',
      deck: PREMADE_DECKS[4] as DeckList,
      code: created.data.room.code.toLowerCase(), // the code accepts lowercase
    });
    expect(joined.ok).toBe(true);

    const rng = randomFrom({ state: 3 });
    const players = [
      { id: 'p1' as const, ...a },
      { id: 'p2' as const, ...b },
    ];
    await until(() => !!a.seen.update && !!b.seen.update);
    for (let step = 0; step < 2000; step++) {
      if (a.seen.update?.state.phase === 'gameOver') break;
      const mover = players.find(
        (p) => p.seen.update && getLegalActions(p.seen.update.state, p.id).length > 0,
      );
      if (!mover) {
        await new Promise((r) => setTimeout(r, 10));
        continue;
      }
      const legal = getLegalActions(mover.seen.update!.state, mover.id);
      const before = mover.seen.update;
      const ack = await mover.socket.emitWithAck('game:action', {
        action: legal[rng.int(legal.length)]!,
      });
      expect(ack).toEqual({ ok: true, data: null });
      await until(() => mover.seen.update !== before);
    }

    // The two final messages arrive at slightly different moments
    await until(() => b.seen.update?.state.phase === 'gameOver');
    expect(a.seen.update?.state.phase).toBe('gameOver');
    expect(b.seen.update?.state.result).toBe(a.seen.update?.state.result);

    // Leaving notifies the other player
    a.socket.emit('room:leave');
    await until(() => b.seen.closed !== null);
    expect(b.seen.closed).toBe('opponentLeft');
    a.socket.disconnect();
    b.socket.disconnect();
  });

  it('rejects invalid messages and actions outside a room', async () => {
    const c = player(url);
    expect(await c.socket.emitWithAck('room:join', { name: '', deck: {} } as never)).toEqual({
      ok: false,
      error: 'INVALID_MESSAGE',
    });
    expect(
      await c.socket.emitWithAck('game:action', { action: { type: 'PASS', player: 'p1' } }),
    ).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    c.socket.disconnect();
  });
});
