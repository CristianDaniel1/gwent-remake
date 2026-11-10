import {
  getLegalActions,
  PLAYER_IDS,
  PREMADE_DECKS,
  randomFrom,
  type DeckList,
  type PlayerId,
} from '@gwent/engine';
import type {
  GameUpdate,
  JoinedRoom,
  RoomClosedReason,
  RoomView,
  SpectatorUpdate,
} from '@gwent/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRecorder } from '../matches/match-recorder';
import { RealtimeError, RoomsService, type RoomNotifier } from './rooms.service';

const deck = PREMADE_DECKS[0] as DeckList;
const OPTIONS = { turnTimeoutMs: 1000, disconnectGraceMs: 5000 };
const PROFILE = '11111111-1111-4111-8111-111111111111';

/** Keeps what each socket received. */
class FakeNotifier implements RoomNotifier {
  games = new Map<string, GameUpdate[]>();
  watched = new Map<string, SpectatorUpdate[]>();
  rooms = new Map<string, RoomView[]>();
  closed = new Map<string, RoomClosedReason>();
  joinedBy = new Map<string, JoinedRoom>();
  joined(socketId: string, joined: JoinedRoom) {
    this.joinedBy.set(socketId, joined);
  }
  roomUpdate(socketId: string, room: RoomView) {
    this.rooms.set(socketId, [...(this.rooms.get(socketId) ?? []), room]);
  }
  gameUpdate(socketId: string, update: GameUpdate) {
    this.games.set(socketId, [...(this.games.get(socketId) ?? []), update]);
  }
  spectatorUpdate(socketId: string, update: SpectatorUpdate) {
    this.watched.set(socketId, [...(this.watched.get(socketId) ?? []), update]);
  }
  roomClosed(socketId: string, reason: RoomClosedReason) {
    this.closed.set(socketId, reason);
  }
  lastGame(socketId: string) {
    return this.games.get(socketId)?.at(-1);
  }
  lastRoom(socketId: string) {
    return this.rooms.get(socketId)?.at(-1);
  }
}

describe('RoomsService', () => {
  let rooms: RoomsService;
  let notifier: FakeNotifier;
  const recorder = { recordOnline: vi.fn<MatchRecorder['recordOnline']>() };
  const sockets: Record<PlayerId, string> = { p1: 'socket-a', p2: 'socket-b' };

  beforeEach(() => {
    vi.useFakeTimers();
    recorder.recordOnline.mockReset().mockResolvedValue(undefined);
    rooms = new RoomsService(OPTIONS, recorder);
    notifier = new FakeNotifier();
    rooms.setNotifier(notifier);
  });
  afterEach(() => {
    rooms.onModuleDestroy();
    vi.useRealTimers();
  });

  /** Room with both players (the match starts when the second one joins). */
  function startRoom() {
    const host = rooms.create(sockets.p1, { name: 'Geralt', deck, profileId: PROFILE });
    const guest = rooms.join(sockets.p2, { name: 'Ciri', deck, code: host.room.code });
    return { host, guest };
  }

  it('creates a room with a 5-letter code and starts the match when the second player joins', () => {
    const { host, guest } = startRoom();
    expect(host.room.code).toMatch(/^[23456789A-HJKMNP-Z]{5}$/);
    expect(guest.room.you).toBe('p2');
    expect(notifier.lastRoom(sockets.p1)).toMatchObject({
      status: 'playing',
      seats: { p1: { name: 'Geralt' }, p2: { name: 'Ciri' } },
    });
    expect(notifier.lastGame(sockets.p1)?.state.phase).toBe('redraw');
  });

  it('sends each player only what they can see', () => {
    startRoom();
    const p1View = notifier.lastGame(sockets.p1)!;
    const p2View = notifier.lastGame(sockets.p2)!;
    expect(p1View.you).toBe('p1');
    for (const id of p1View.state.players.p2.hand) expect(p1View.state.cards[id]).toBeUndefined();
    for (const id of p1View.state.players.p1.hand) expect(p1View.state.cards[id]).toBeDefined();
    for (const id of p2View.state.players.p1.hand) expect(p2View.state.cards[id]).toBeUndefined();
    expect(p1View.state.seed).toBe(0);
  });

  it("rejects actions on the opponent's behalf, full rooms and invalid decks", () => {
    const { host } = startRoom();
    expect(() => rooms.act(sockets.p1, { type: 'END_REDRAW', player: 'p2' })).toThrow(
      RealtimeError,
    );
    expect(() => rooms.join('socket-c', { name: 'X', deck, code: host.room.code })).toThrow(
      'ROOM_FULL',
    );
    const invalid: DeckList = { faction: 'realms', leader: 22, cards: [[27, 1]] };
    expect(() => rooms.create('socket-d', { name: 'Y', deck: invalid })).toThrow('INVALID_DECK');
    expect(() => rooms.join('socket-e', { name: 'Z', deck, code: 'ZZZZZ' })).toThrow(
      'ROOM_NOT_FOUND',
    );
  });

  it('plays a full match with each client using only its own view, records it and allows a rematch', () => {
    startRoom();
    const rng = randomFrom({ state: 9 });
    for (let step = 0; step < 2000; step++) {
      const views = PLAYER_IDS.map((p) => ({ p, update: notifier.lastGame(sockets[p])! }));
      if (views[0]!.update.state.phase === 'gameOver') break;
      // Whoever has a legal move (computed only from their own view) plays
      const mover = views.find(({ p, update }) => getLegalActions(update.state, p).length > 0);
      if (!mover) throw new Error('nobody can act');
      const legal = getLegalActions(mover.update.state, mover.p);
      rooms.act(sockets[mover.p], legal[rng.int(legal.length)]!);
    }
    expect(notifier.lastRoom(sockets.p1)?.status).toBe('finished');
    expect(notifier.lastGame(sockets.p2)?.state.result).not.toBeNull();
    // The finished match goes to the history with everything needed to replay it
    expect(recorder.recordOnline).toHaveBeenCalledTimes(1);
    const record = recorder.recordOnline.mock.calls[0]![0];
    expect(record.players).toEqual({
      p1: { name: 'Geralt', profileId: PROFILE },
      p2: { name: 'Ciri', profileId: undefined },
    });
    expect(record.actions.length).toBeGreaterThan(0);

    rooms.rematch(sockets.p1);
    expect(notifier.lastRoom(sockets.p2)?.seats.p1?.wantsRematch).toBe(true);
    rooms.rematch(sockets.p2);
    expect(notifier.lastRoom(sockets.p1)?.status).toBe('playing');
    expect(notifier.lastGame(sockets.p1)?.state.phase).toBe('redraw');
  });

  it('makes the automatic move (ends the redraw) for a player who takes too long', () => {
    startRoom();
    vi.advanceTimersByTime(OPTIONS.turnTimeoutMs);
    const state = notifier.lastGame(sockets.p1)!.state;
    expect(state.phase).not.toBe('redraw');
  });

  it('keeps the room open on a dropped connection, tells the opponent and resumes with the token', () => {
    const { host } = startRoom();
    rooms.disconnect(sockets.p1);
    expect(notifier.lastRoom(sockets.p2)?.seats.p1?.connected).toBe(false);

    const resumed = rooms.resume('socket-a2', host.token);
    expect(resumed.room.you).toBe('p1');
    expect(notifier.lastGame('socket-a2')?.you).toBe('p1');
    vi.advanceTimersByTime(OPTIONS.disconnectGraceMs);
    expect(notifier.closed.size).toBe(0);
  });

  it('closes the room and tells the opponent when there is no reconnection in time', () => {
    startRoom();
    rooms.disconnect(sockets.p1);
    vi.advanceTimersByTime(OPTIONS.disconnectGraceMs);
    expect(notifier.closed.get(sockets.p2)).toBe('opponentTimedOut');
    expect(rooms.openRooms).toBe(0);
  });

  it('closes the room for both players when one leaves', () => {
    startRoom();
    rooms.leave(sockets.p2);
    expect(notifier.closed.get(sockets.p1)).toBe('opponentLeft');
    expect(rooms.openRooms).toBe(0);
  });

  it('pairs the second player in the quick match queue with the first', () => {
    expect(rooms.enqueue('q1', { name: 'A', deck })).toEqual({ waiting: 0 });
    expect(rooms.enqueue('q2', { name: 'B', deck })).toEqual({ waiting: 1 });
    expect(notifier.joinedBy.get('q1')?.room.you).toBe('p1');
    expect(notifier.joinedBy.get('q2')?.room.you).toBe('p2');
    expect(notifier.lastRoom('q1')?.status).toBe('playing');
  });
  describe('spectators', () => {
    it('lets a spectator watch the match without seeing any hand', () => {
      const { host } = startRoom();
      const { room } = rooms.watch('watcher', host.room.code.toUpperCase());
      expect(room.you).toBeNull();
      expect(room.spectators).toBe(1);
      const view = notifier.watched.get('watcher')?.at(-1);
      for (const p of PLAYER_IDS) {
        expect(view?.state.players[p].hand.length).toBeGreaterThan(0);
        for (const id of view!.state.players[p].hand) expect(view?.state.cards[id]).toBeUndefined();
      }
      // The players see how many people are watching
      expect(notifier.lastRoom(sockets.p1)?.spectators).toBe(1);
    });

    it('sends every move to the spectators and lists the match as live', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      const before = notifier.watched.get('watcher')?.length ?? 0;
      rooms.act(sockets.p1, { type: 'END_REDRAW', player: 'p1' });
      expect(notifier.watched.get('watcher')?.length).toBe(before + 1);
      expect(rooms.liveRooms()).toEqual([
        { code: host.room.code, names: { p1: 'Geralt', p2: 'Ciri' }, round: 0, spectators: 1 },
      ]);
    });

    it('stops sending updates after the spectator leaves and tells the players', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      rooms.leave('watcher');
      expect(notifier.lastRoom(sockets.p1)?.spectators).toBe(0);
      expect(rooms.openRooms).toBe(1); // a spectator leaving does not close the room
      const count = notifier.watched.get('watcher')?.length;
      rooms.act(sockets.p1, { type: 'END_REDRAW', player: 'p1' });
      expect(notifier.watched.get('watcher')?.length).toBe(count);
    });

    it('tells the spectators when the room closes', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      rooms.leave(sockets.p2);
      expect(notifier.closed.get('watcher')).toBe('opponentLeft');
    });

    it('rejects watching an unknown room or a room the socket plays in', () => {
      const { host } = startRoom();
      expect(() => rooms.watch('watcher', 'ZZZZZ')).toThrow('ROOM_NOT_FOUND');
      expect(() => rooms.watch(sockets.p1, host.room.code)).toThrow('ALREADY_IN_ROOM');
    });
  });
});
