import { createGame, PREMADE_DECKS, projectFor, type DeckList } from '@gwent/engine';
import type { RoomView } from '@gwent/shared';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { useOnlineStore } from './store/online.store';
import { SpectatePage } from './SpectatePage';

const { state } = createGame({
  seed: 4,
  decks: { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[2] as DeckList },
});
const room: RoomView = {
  code: 'ABCDE',
  you: null,
  status: 'playing',
  seats: {
    p1: { name: 'Geralt', connected: true, wantsRematch: false },
    p2: { name: 'Ciri', connected: true, wantsRematch: false },
  },
  spectators: 2,
};

const initial = useOnlineStore.getState();
afterEach(() => useOnlineStore.setState(initial, true));

const watching = () => {
  const leave = vi.fn();
  useOnlineStore.setState({
    phase: 'watching',
    room,
    watched: { state: projectFor(state, null), events: [], seq: 1 },
    leave,
  });
  renderWithProviders(<SpectatePage />, {
    route: { path: '/online/watch', entry: '/online/watch' },
  });
  return { leave };
};

describe('SpectatePage', () => {
  it('shows the live match with both hands face down and the spectator count', () => {
    watching();
    expect(screen.getByRole('region', { name: 'Geralt' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ciri' })).toBeInTheDocument();
    expect(screen.getByText('2 assistindo')).toBeInTheDocument();
    const hand = screen.getByRole('region', { name: /cartas na mão/ });
    expect(within(hand).queryAllByRole('button')).toHaveLength(0);
    expect(within(hand).queryAllByRole('img')).toHaveLength(0);
  });

  it('swaps the side shown at the bottom', async () => {
    watching();
    const panels = () =>
      screen
        .getAllByRole('region', { name: /^(Geralt|Ciri)$/ })
        .map((panel) => panel.getAttribute('aria-label'));
    expect(panels()).toEqual(['Ciri', 'Geralt']);
    await userEvent.click(screen.getByRole('button', { name: 'Ver do lado de Ciri' }));
    expect(panels()).toEqual(['Geralt', 'Ciri']);
  });

  it('stops watching without a confirmation', async () => {
    const { leave } = watching();
    await userEvent.click(screen.getByRole('button', { name: 'Parar de assistir' }));
    expect(leave).toHaveBeenCalled();
  });

  it('tells the spectator when the match ends', async () => {
    watching();
    act(() => useOnlineStore.setState({ phase: 'closed', closedReason: 'opponentLeft' }));
    expect(
      await screen.findByRole('dialog', { name: 'A partida foi encerrada.' }),
    ).toBeInTheDocument();
  });
});
