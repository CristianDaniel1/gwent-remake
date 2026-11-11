import type { GameAction } from '@gwent/engine';
import { useEffect } from 'react';
import { reportError } from '@/shared/lib/report-error';
import { thinkBotMove } from '../bot/think';
import { BOT_DELAY_MS, HARD_DELAY_MS } from '../constants/bot';
import type { LocalMatch } from '../interfaces/match';
import { useGameStore } from '../store/game.store';

const playBotTurn = async (
  match: LocalMatch,
  isCancelled: () => boolean,
  dispatch: (action: GameAction) => boolean,
) => {
  try {
    const action = await thinkBotMove(
      match.difficulty,
      match.state,
      match.opponent,
      match.botRandom,
    );
    if (action && !isCancelled()) dispatch(action);
  } catch (error) {
    reportError('bot turn', error);
  }
};

/** Plays the computer's turn after a short delay whenever it has to act. */
export const useBotTurn = () => {
  const match = useGameStore((store) => store.match);
  const busy = useGameStore((store) => !!store.notices.length || store.settling);
  const dispatch = useGameStore((store) => store.dispatch);

  useEffect(() => {
    if (match?.mode !== 'local' || busy || match.state.phase === 'gameOver') return;
    let cancelled = false;
    const delay = match.difficulty === 'hard' ? HARD_DELAY_MS : BOT_DELAY_MS;
    const timer = setTimeout(() => void playBotTurn(match, () => cancelled, dispatch), delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [match, busy, dispatch]);
};
