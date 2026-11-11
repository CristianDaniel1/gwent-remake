import { Logger } from '@nestjs/common';
import { getLegalActions, PLAYER_IDS, randomFrom, type PlayerId } from '@gwent/engine';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INCOMPLETE_DECK, PROFILE_ID, TEST_DECKS } from '../../../test/constants/test.constants';
import { FakeNotifier } from '../../../test/helpers/fake-notifier';
import type { MatchRecorder } from '../matches/interfaces/match-recorder.interface';
import { RealtimeError } from './errors/realtime.error';
import { RoomsService } from './rooms.service';

const OPTIONS = { turnTimeoutMs: 1000, disconnectGraceMs: 5000 };
const SOCKETS: Record<PlayerId, string> = { p1: 'socket-p1', p2: 'socket-p2' };
const MAX_STEPS = 2000;

describe('RoomsService', () => {
  let rooms: RoomsService;
  let notifier: FakeNotifier;
  const recorder = { recordOnline: vi.fn<MatchRecorder['recordOnline']>() };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
    recorder.recordOnline.mockReset().mockResolvedValue(undefined);
    rooms = new RoomsService(OPTIONS, recorder);
    notifier = new FakeNotifier();
    rooms.setNotifier(notifier);
  });

  afterEach(() => {
    rooms.onModuleDestroy();
    vi.useRealTimers();
  });

  /**
   * Opens a room with both players; the match starts when the second one joins.
   *
   * @returns What the host and the guest received when they took their seats.
   */
  const startRoom = () => {
    const host = rooms.create(SOCKETS.p1, {
      name: 'Geralt',
      deck: TEST_DECKS.p1,
      profileId: PROFILE_ID,
    });
    const guest = rooms.join(SOCKETS.p2, {
      name: 'Ciri',
      deck: TEST_DECKS.p2,
      code: host.room.code,
    });
    return { host, guest };
  };

  /**
   * Reads the latest match update of a player, failing when none arrived.
   *
   * @param player - Seat to read.
   * @returns The latest update sent to that player.
   */
  const lastGameOf = (player: PlayerId) => {
    const update = notifier.lastGame(SOCKETS[player]);
    if (!update) throw new Error(`no update sent to ${player}`);
    return update;
  };

  /** Plays random legal moves, each player using only its own view, until the match ends. */
  const playUntilGameOver = () => {
    const random = randomFrom({ state: 9 });
    for (let step = 0; step < MAX_STEPS; step++) {
      if (lastGameOf('p1').state.phase === 'gameOver') return;
      const mover = PLAYER_IDS.find(
        (player) => getLegalActions(lastGameOf(player).state, player).length > 0,
      );
      if (!mover) throw new Error('nobody can act');
      const legal = getLegalActions(lastGameOf(mover).state, mover);
      const action = legal[random.int(legal.length)];
      if (action) rooms.act(SOCKETS[mover], action);
    }
    throw new Error('the match did not end');
  };

  describe('joining', () => {
    it('creates a room with a 5-letter code and starts the match when the second player joins', () => {
      const { host, guest } = startRoom();
      expect(host.room.code).toMatch(/^[23456789A-HJKMNP-Z]{5}$/);
      expect(guest.room.you).toBe('p2');
      expect(notifier.lastRoom(SOCKETS.p1)).toMatchObject({
        status: 'playing',
        seats: { p1: { name: 'Geralt' }, p2: { name: 'Ciri' } },
      });
      expect(lastGameOf('p1').state.phase).toBe('redraw');
    });

    it('rejects a full room, an unknown room and an unplayable deck', () => {
      const { host } = startRoom();
      const third = { name: 'Yen', deck: TEST_DECKS.p1 };
      expect(() => rooms.join('socket-3', { ...third, code: host.room.code })).toThrow('ROOM_FULL');
      expect(() => rooms.join('socket-3', { ...third, code: 'ZZZZZ' })).toThrow('ROOM_NOT_FOUND');
      expect(() => rooms.create('socket-3', { ...third, deck: INCOMPLETE_DECK })).toThrow(
        'INVALID_DECK',
      );
    });

    it('pairs the second player in the quick match queue with the first', () => {
      expect(rooms.enqueue('queue-1', { name: 'Geralt', deck: TEST_DECKS.p1 })).toEqual({
        waiting: 0,
      });
      expect(rooms.enqueue('queue-2', { name: 'Ciri', deck: TEST_DECKS.p2 })).toEqual({
        waiting: 1,
      });
      expect(notifier.joinedBy.get('queue-1')?.room.you).toBe('p1');
      expect(notifier.joinedBy.get('queue-2')?.room.you).toBe('p2');
      expect(notifier.lastRoom('queue-1')?.status).toBe('playing');
    });

    it('does not pair a player who left the queue', () => {
      rooms.enqueue('queue-1', { name: 'Geralt', deck: TEST_DECKS.p1 });
      rooms.dequeue('queue-1');
      expect(rooms.enqueue('queue-2', { name: 'Ciri', deck: TEST_DECKS.p2 })).toEqual({
        waiting: 0,
      });
    });
  });

  describe('playing', () => {
    it('sends each player only what they can see', () => {
      startRoom();
      const p1View = lastGameOf('p1');
      const p2View = lastGameOf('p2');
      expect(p1View.you).toBe('p1');
      for (const id of p1View.state.players.p2.hand) expect(p1View.state.cards[id]).toBeUndefined();
      for (const id of p1View.state.players.p1.hand) expect(p1View.state.cards[id]).toBeDefined();
      for (const id of p2View.state.players.p1.hand) expect(p2View.state.cards[id]).toBeUndefined();
      expect(p1View.state.seed).toBe(0);
    });

    it("rejects an action on the opponent's behalf", () => {
      startRoom();
      const act = () => rooms.act(SOCKETS.p1, { type: 'END_REDRAW', player: 'p2' });
      expect(act).toThrow(new RealtimeError('ILLEGAL_ACTION'));
    });

    it('rejects actions and rematches from a socket outside any room', () => {
      expect(() => rooms.act('stranger', { type: 'PASS', player: 'p1' })).toThrow('NOT_IN_ROOM');
      expect(() => rooms.rematch('stranger')).toThrow('NOT_IN_ROOM');
    });

    it('plays a whole match and sends it to the history with everything needed to replay it', () => {
      startRoom();
      playUntilGameOver();
      expect(notifier.lastRoom(SOCKETS.p1)?.status).toBe('finished');
      expect(recorder.recordOnline).toHaveBeenCalledOnce();
      const record = recorder.recordOnline.mock.calls[0]?.[0];
      expect(record?.players).toEqual({
        p1: { name: 'Geralt', profileId: PROFILE_ID },
        p2: { name: 'Ciri', profileId: undefined },
      });
      expect(record?.actions.length).toBeGreaterThan(0);
    });

    it('starts a new match when both players ask for a rematch', () => {
      startRoom();
      playUntilGameOver();
      rooms.rematch(SOCKETS.p1);
      expect(notifier.lastRoom(SOCKETS.p2)?.seats.p1?.wantsRematch).toBe(true);
      rooms.rematch(SOCKETS.p2);
      expect(notifier.lastRoom(SOCKETS.p1)?.status).toBe('playing');
      expect(lastGameOf('p1').state.phase).toBe('redraw');
    });
  });

  describe('timers', () => {
    it('makes the automatic move (ends the redraw) for a player who takes too long', () => {
      startRoom();
      vi.advanceTimersByTime(OPTIONS.turnTimeoutMs);
      expect(lastGameOf('p1').state.phase).not.toBe('redraw');
    });

    it('logs an error inside a timer instead of letting it stop the process', () => {
      const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      startRoom();
      vi.spyOn(notifier, 'gameUpdate').mockImplementation(() => {
        throw new Error('socket closed');
      });
      expect(() => vi.advanceTimersByTime(OPTIONS.turnTimeoutMs)).not.toThrow();
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('connection', () => {
    it('keeps the room open on a dropped connection, tells the opponent and resumes with the token', () => {
      const { host } = startRoom();
      rooms.disconnect(SOCKETS.p1);
      expect(notifier.lastRoom(SOCKETS.p2)?.seats.p1?.connected).toBe(false);

      const resumed = rooms.resume('socket-p1-again', host.token);
      expect(resumed.room.you).toBe('p1');
      expect(notifier.lastGame('socket-p1-again')?.you).toBe('p1');
      vi.advanceTimersByTime(OPTIONS.disconnectGraceMs);
      expect(notifier.closed.size).toBe(0);
    });

    it('rejects resuming with an unknown token', () => {
      expect(() => rooms.resume('socket-1', 'unknown-token')).toThrow('SESSION_NOT_FOUND');
    });

    it('closes the room and tells the opponent when there is no reconnection in time', () => {
      startRoom();
      rooms.disconnect(SOCKETS.p1);
      vi.advanceTimersByTime(OPTIONS.disconnectGraceMs);
      expect(notifier.closed.get(SOCKETS.p2)).toBe('opponentTimedOut');
      expect(rooms.openRooms).toBe(0);
    });

    it('closes the room for both players when one leaves', () => {
      startRoom();
      rooms.leave(SOCKETS.p2);
      expect(notifier.closed.get(SOCKETS.p1)).toBe('opponentLeft');
      expect(rooms.openRooms).toBe(0);
    });
  });

  describe('spectators', () => {
    it('lets a spectator watch the match without seeing any hand', () => {
      const { host } = startRoom();
      const { room } = rooms.watch('watcher', host.room.code);
      expect(room.you).toBeNull();
      expect(room.spectators).toBe(1);
      const view = notifier.watched.get('watcher')?.at(-1);
      for (const player of PLAYER_IDS) {
        const hand = view?.state.players[player].hand ?? [];
        expect(hand.length).toBeGreaterThan(0);
        for (const id of hand) expect(view?.state.cards[id]).toBeUndefined();
      }
    });

    it('tells the players how many people are watching', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      expect(notifier.lastRoom(SOCKETS.p1)?.spectators).toBe(1);
    });

    it('sends every move to the spectators and lists the match as live', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      const before = notifier.watched.get('watcher')?.length ?? 0;
      rooms.act(SOCKETS.p1, { type: 'END_REDRAW', player: 'p1' });
      expect(notifier.watched.get('watcher')?.length).toBe(before + 1);
      expect(rooms.liveRooms()).toEqual([
        { code: host.room.code, names: { p1: 'Geralt', p2: 'Ciri' }, round: 0, spectators: 1 },
      ]);
    });

    it('stops sending updates after the spectator leaves, without closing the room', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      rooms.leave('watcher');
      expect(notifier.lastRoom(SOCKETS.p1)?.spectators).toBe(0);
      expect(rooms.openRooms).toBe(1);
      const received = notifier.watched.get('watcher')?.length;
      rooms.act(SOCKETS.p1, { type: 'END_REDRAW', player: 'p1' });
      expect(notifier.watched.get('watcher')?.length).toBe(received);
    });

    it('tells the spectators when the room closes', () => {
      const { host } = startRoom();
      rooms.watch('watcher', host.room.code);
      rooms.leave(SOCKETS.p2);
      expect(notifier.closed.get('watcher')).toBe('opponentLeft');
    });

    it('rejects watching an unknown room or a room the socket plays in', () => {
      const { host } = startRoom();
      expect(() => rooms.watch('watcher', 'ZZZZZ')).toThrow('ROOM_NOT_FOUND');
      expect(() => rooms.watch(SOCKETS.p1, host.room.code)).toThrow('ALREADY_IN_ROOM');
    });
  });
});
