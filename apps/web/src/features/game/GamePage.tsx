import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { matchDecks } from '@/features/deck-builder';
import { useSettingsStore } from '@/features/settings';
import { Board } from './components/Board';
import { useBotTurn } from './hooks/useBotTurn';
import { useGameSounds } from './hooks/useGameSounds';
import { toReplayFile } from './lib/replay';
import { randomSeed } from './lib/setup';
import { useGameStore } from './store/game.store';
import { useUiStore } from './store/ui.store';

const seedFrom = (params: URLSearchParams): number => {
  const raw = params.get('seed');
  const value = raw ? Number(raw) : NaN;
  return Number.isInteger(value) && value >= 0 ? value >>> 0 : randomSeed();
};

export const GamePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const match = useGameStore((store) => store.match);
  const startMatch = useGameStore((store) => store.startMatch);
  const leave = useGameStore((store) => store.leave);
  const resetUi = useUiStore((store) => store.reset);
  useBotTurn();
  useGameSounds();

  const start = useCallback(
    (seed: number) => {
      resetUi();
      const decks = matchDecks(seed);
      if (!decks) return void navigate('/deck-builder', { replace: true });
      const { botDifficulty: difficulty, mutators } = useSettingsStore.getState();
      startMatch({ seed, decks, difficulty, mutators });
    },
    [resetUi, startMatch, navigate],
  );

  useEffect(() => {
    start(seedFrom(params));
    return () => {
      leave();
      resetUi();
    };
  }, [params, start, leave, resetUi]);

  if (!match) return null;

  return (
    <Board
      match={match}
      onPlayAgain={() => start(randomSeed())}
      onExit={() => void navigate('/')}
      onWatchReplay={
        match.mode === 'local'
          ? () => void navigate('/replay/local', { state: toReplayFile(match) })
          : undefined
      }
    />
  );
};
