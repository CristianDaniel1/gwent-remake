import { createGame, PREMADE_DECKS, projectFor, type DeckList } from '@gwent/engine';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './game.store';

const { state } = createGame({
  seed: 1,
  decks: { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[2] as DeckList },
});
const update = { you: 'p1' as const, state: projectFor(state, 'p1'), events: [] };
const endRedraw = { type: 'END_REDRAW', player: 'p1' } as const;

function startOnline(send: (action: unknown) => Promise<boolean>) {
  useGameStore.getState().receiveOnline(update, { opponentName: 'Ciri', send });
}

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
    // Second click before the answer: it does not leave the browser
    expect(useGameStore.getState().dispatch(endRedraw)).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);

    // The new server state unlocks the interface
    startOnline(send);
    expect(awaiting()).toBe(false);
  });

  it('unlocks the interface when the move is rejected', async () => {
    startOnline(() => Promise.resolve(false));
    useGameStore.getState().dispatch(endRedraw);
    await vi.waitFor(() => expect(awaiting()).toBe(false));
  });
});
