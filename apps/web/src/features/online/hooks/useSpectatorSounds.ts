import type { GameState, PlayerId } from '@gwent/engine';
import type { SpectatorUpdate } from '@gwent/shared';
import { useEffect, useRef } from 'react';
import { playMoveSounds } from '@/features/game';

/**
 * Plays the sounds of each move received while watching a match.
 *
 * @param watched - Latest update of the watched match.
 * @param bottom - Player shown at the bottom.
 */
export const useSpectatorSounds = (
  watched: (SpectatorUpdate & { seq: number }) | null,
  bottom: PlayerId,
) => {
  const lastState = useRef<GameState | null>(null);
  const lastSeq = useRef(0);

  useEffect(() => {
    if (!watched || watched.seq === lastSeq.current) return;
    const previous = lastState.current;
    lastSeq.current = watched.seq;
    lastState.current = watched.state;
    if (previous) playMoveSounds(watched.events, watched.state, bottom, previous.currentPlayer);
  }, [watched, bottom]);
};
