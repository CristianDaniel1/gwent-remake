import type { PlayerId } from '@gwent/engine';
import { useLayoutEffect, useRef } from 'react';
import { playMoveSounds } from '@/features/game';
import type { Timeline } from '../interfaces/timeline';

/**
 * Plays the sounds of a move when the replay moves one step forward.
 *
 * @param timeline - Replay timeline.
 * @param frame - Current frame.
 * @param bottom - Player shown at the bottom.
 */
export const useStepSounds = (timeline: Timeline, frame: number, bottom: PlayerId) => {
  const previousFrame = useRef(frame);
  useLayoutEffect(() => {
    const from = previousFrame.current;
    previousFrame.current = frame;
    const current = timeline.frames[frame];
    const before = timeline.frames[frame - 1];
    if (frame === from + 1 && current && before)
      playMoveSounds(current.events, current.state, bottom, before.state.currentPlayer);
  }, [timeline, frame, bottom]);
};
