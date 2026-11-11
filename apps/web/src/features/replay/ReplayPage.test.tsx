import {
  applyAction,
  chooseAiAction,
  createGame,
  PLAYER_IDS,
  PREMADE_DECKS,
  randomFrom,
  type DeckList,
  type GameAction,
} from '@gwent/engine';
import { REPLAY_FILE_VERSION, type ReplayFile } from '@gwent/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { parseReplayFile } from '@/shared/lib/replay-file';
import { ReplayPage } from './ReplayPage';

const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[2] as DeckList };

const replayFile = (seed: number): ReplayFile => {
  let { state } = createGame({ seed, decks });
  const random = randomFrom({ state: seed });
  const actions: GameAction[] = [];
  while (state.phase !== 'gameOver') {
    const action = PLAYER_IDS.map((player) => chooseAiAction(state, player, random)).find(Boolean)!;
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    actions.push(action);
  }
  return {
    version: REPLAY_FILE_VERSION,
    seed,
    decks,
    actions,
    side: 'p1',
    names: { p1: 'Geralt', p2: '' },
  };
};

const renderReplay = (state: unknown) =>
  renderWithProviders(<ReplayPage />, {
    route: { path: '/replay/:id', entry: { pathname: '/replay/local', state } },
  });

describe('ReplayPage', () => {
  it('starts at the beginning and steps through the moves with captions', async () => {
    const replay = replayFile(8);
    renderReplay(replay);
    const total = replay.actions.length;
    expect(screen.getByText(`Jogada 0/${total}`)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Geralt' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Computador' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Próxima jogada' }));
    expect(screen.getByText(`Jogada 1/${total}`)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/Geralt|Computador/);
    expect(screen.getByText(/^O bot faria: /)).toBeInTheDocument();
  });

  it('jumps to the end and shows the result', async () => {
    const replay = replayFile(8);
    renderReplay(replay);
    await userEvent.click(screen.getByRole('button', { name: 'Fim' }));
    expect(
      screen.getByText(`Jogada ${replay.actions.length}/${replay.actions.length}`),
    ).toBeInTheDocument();
    expect(screen.getByText(/Vitória de (Geralt|Computador)|Empate/)).toBeInTheDocument();
  });

  it('swaps the side shown at the bottom', async () => {
    renderReplay(replayFile(8));
    const panels = () => screen.getAllByRole('region', { name: /Geralt|Computador/ });
    expect(panels().map((panel) => panel.getAttribute('aria-label'))).toEqual([
      'Computador',
      'Geralt',
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Ver do lado de Computador' }));
    expect(panels().map((panel) => panel.getAttribute('aria-label'))).toEqual([
      'Geralt',
      'Computador',
    ]);
  });

  it('explains when there is no replay to show', () => {
    renderReplay(null);
    expect(screen.getByText('Replay não encontrado.')).toBeInTheDocument();
  });
});

describe('parseReplayFile', () => {
  it('round-trips an exported replay and rejects anything else', () => {
    const replay = replayFile(8);
    expect(parseReplayFile(JSON.stringify(replay))).toEqual(replay);
    expect(parseReplayFile('not json')).toBeNull();
    expect(parseReplayFile(JSON.stringify({ ...replay, version: 99 }))).toBeNull();
  });
});
