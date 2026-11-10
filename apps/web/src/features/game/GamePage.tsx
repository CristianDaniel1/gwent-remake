import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { REPLAY_FILE_VERSION, type ReplayFile } from '@gwent/shared';
import { matchDecks } from '@/features/deck-builder';
import { useSettingsStore } from '@/features/settings';
import { Board } from './components/Board';
import { useBotTurn } from './hooks/useBotTurn';
import { useGameSounds } from './hooks/useGameSounds';
import { randomSeed } from './lib/setup';
import { useGameStore } from './store/game.store';
import { useUiStore } from './store/ui.store';

/** Seed from the URL (`/game?seed=123`) reproduces the same match: useful for tests and bugs. */
function seedFrom(params: URLSearchParams): number {
  const raw = params.get('seed');
  const value = raw === null || raw === '' ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 0 ? value >>> 0 : randomSeed();
}

export function GamePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const match = useGameStore((s) => s.match);
  const startMatch = useGameStore((s) => s.startMatch);
  const leave = useGameStore((s) => s.leave);
  const resetUi = useUiStore((s) => s.reset);
  useBotTurn();
  useGameSounds();

  /** Starts with the deck builder decks; without a ready deck, goes back to the deck builder. */
  const start = useCallback(
    (seed: number) => {
      resetUi();
      const decks = matchDecks(seed);
      const { botDifficulty: difficulty, mutators } = useSettingsStore.getState();
      if (decks) startMatch({ seed, decks, difficulty, mutators });
      else void navigate('/deck-builder', { replace: true });
    },
    [resetUi, startMatch, navigate],
  );

  // A new match when entering the page (and no "ghost" match when leaving).
  useEffect(() => {
    start(seedFrom(params));
    return () => {
      leave();
      resetUi();
    };
  }, [params, start, leave, resetUi]);

  if (!match) return null;

  /** The replay is rebuilt from the seed, the decks and the actions: no server needed. */
  const watchReplay = () => {
    if (match.mode !== 'local') return;
    const replay: ReplayFile = {
      version: REPLAY_FILE_VERSION,
      seed: match.setup.seed,
      decks: match.setup.decks,
      mutators: [...(match.setup.mutators ?? [])],
      actions: match.actions,
      side: match.human,
      names: { p1: '', p2: '' },
      createdAt: new Date().toISOString(),
    };
    void navigate('/replay/local', { state: replay });
  };

  return (
    <Board
      match={match}
      onPlayAgain={() => start(randomSeed())}
      onExit={() => void navigate('/')}
      onWatchReplay={watchReplay}
    />
  );
}
