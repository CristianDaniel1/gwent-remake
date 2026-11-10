import { useEffect } from 'react';
import { thinkBotMove } from '../bot/think';
import { useGameStore } from '../store/game.store';

/** Pause before the bot acts, so the player can follow the move. */
export const BOT_DELAY_MS = 900;
/** The hard bot already spends time thinking, so it waits less before starting. */
const HARD_DELAY_MS = 300;

/**
 * Makes the bot play on its turn (or choice) when no notification is on screen.
 * The decision starts inside the timer: in StrictMode the effect may run twice,
 * but the cleanup cancels the first timer (and ignores a late answer), so the bot decides once.
 */
export function useBotTurn() {
  const match = useGameStore((s) => s.match);
  const busy = useGameStore((s) => s.notices.length > 0);
  const dispatch = useGameStore((s) => s.dispatch);

  useEffect(() => {
    // Only against the bot (online, the opponent is another person)
    if (match?.mode !== 'local' || busy || match.state.phase === 'gameOver') return;
    let cancelled = false;
    const delay = match.difficulty === 'hard' ? HARD_DELAY_MS : BOT_DELAY_MS;
    const timer = setTimeout(() => {
      void thinkBotMove(match.difficulty, match.state, match.opponent, match.botRandom).then(
        (action) => {
          if (!cancelled && action) dispatch(action);
        },
      );
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [match, busy, dispatch]);
}
