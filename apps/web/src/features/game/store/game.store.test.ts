import {
  createGame,
  PREMADE_DECKS,
  projectFor,
  type CardInstanceId,
  type DeckList,
  type GameEvent,
} from '@gwent/engine';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANDING_MS } from '../constants/timings';
import { SPOTLIGHT_MS } from '../constants/timings';
import { useGameStore } from './game.store';

const { state } = createGame({
  seed: 1,
  decks: { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[2] as DeckList },
});
const update = { you: 'p1' as const, state: projectFor(state, 'p1'), events: [] };
const endRedraw = { type: 'END_REDRAW', player: 'p1' } as const;

const startOnline = (send: (action: unknown) => Promise<boolean>) => {
  useGameStore.getState().receiveOnline(update, { opponentName: 'Ciri', send });
};

const awaiting = () => {
  const match = useGameStore.getState().match;
  return match?.mode === 'online' && match.awaiting;
};

afterEach(() => useGameStore.getState().leave());

describe('game store online', () => {
  it('sends one move at a time until the server answers', () => {
    const send = vi.fn(() => new Promise<boolean>(() => {}));
    startOnline(send);

    expect(useGameStore.getState().dispatch(endRedraw)).toBe(true);
    expect(awaiting()).toBe(true);
    expect(useGameStore.getState().dispatch(endRedraw)).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);

    startOnline(send);
    expect(awaiting()).toBe(false);
  });

  it('unlocks the interface when the move is rejected', async () => {
    startOnline(() => Promise.resolve(false));
    useGameStore.getState().dispatch(endRedraw);
    await vi.waitFor(() => expect(awaiting()).toBe(false));
  });
});

describe('presenting the opponent move', () => {
  const card = update.state.players.p1.hand[0] as CardInstanceId;
  const opponentPlayed = (extra: GameEvent[] = []) => ({
    you: 'p1' as const,
    state: structuredClone(update.state),
    events: [
      { type: 'CARD_PLAYED', player: 'p2', cardId: card } as GameEvent,
      { type: 'TURN_STARTED', player: 'p1' } as GameEvent,
      ...extra,
    ],
  });
  const connection = { opponentName: 'Ciri', send: () => Promise.resolve(true) };
  const store = () => useGameStore.getState();

  beforeEach(() => {
    vi.useFakeTimers();
    store().receiveOnline(update, connection);
    useGameStore.setState({ notices: [], lastTurn: 'p2' });
  });
  afterEach(() => vi.useRealTimers());

  it('shows the played card enlarged before applying the new state', () => {
    const before = store().match?.state;
    const next = opponentPlayed();
    store().receiveOnline(next, connection);
    vi.advanceTimersByTime(0);

    expect(store().spotlight?.cardId).toBe(card);
    expect(store().match?.state).toBe(before);

    vi.advanceTimersByTime(SPOTLIGHT_MS);
    expect(store().spotlight).toBeNull();
    expect(store().match?.state).toBe(next.state);
  });

  it('holds the turn notice (and the bot) until the card has landed', () => {
    store().receiveOnline(opponentPlayed(), connection);
    vi.advanceTimersByTime(SPOTLIGHT_MS);

    expect(store().notices).toEqual([]);
    expect(store().settling).toBe(true);

    vi.advanceTimersByTime(LANDING_MS);
    expect(store().notices.map((notice) => notice.key)).toEqual(['me-turn']);
    expect(store().settling).toBe(false);
  });

  it('applies updates that arrive meanwhile afterwards, in order', () => {
    const first = opponentPlayed();
    const second = { you: 'p1' as const, state: structuredClone(update.state), events: [] };
    store().receiveOnline(first, connection);
    store().receiveOnline(second, connection);

    vi.advanceTimersByTime(SPOTLIGHT_MS - 1);
    expect(store().match?.state).not.toBe(second.state);
    vi.advanceTimersByTime(1);
    expect(store().match?.state).toBe(second.state);
  });

  it('applies the move at once when the person prefers reduced motion', () => {
    const matchMedia = vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }));
    vi.stubGlobal('matchMedia', matchMedia);
    try {
      const next = opponentPlayed();
      store().receiveOnline(next, connection);

      expect(store().spotlight).toBeNull();
      expect(store().match?.state).toBe(next.state);
      expect(store().settling).toBe(false);
      expect(store().notices.map((notice) => notice.key)).toEqual(['me-turn']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refuses moves while the board is not up to date', () => {
    store().receiveOnline(opponentPlayed(), connection);
    expect(store().dispatch(endRedraw)).toBe(false);
    vi.advanceTimersByTime(SPOTLIGHT_MS);
    expect(store().dispatch(endRedraw)).toBe(true);
  });
});
