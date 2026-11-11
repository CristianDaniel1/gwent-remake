import { useEffect, useState } from 'react';
import { PLAYBACK_STEP_MS } from '../constants/playback';
import type { Speed } from '../interfaces/playback';

/**
 * Controls the replay position with play, pause, seek and speed.
 *
 * @param last - Index of the last frame.
 * @returns The current frame, playback state and controls.
 */
export const usePlayback = (last: number) => {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  const active = playing && frame < last;

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(
      () => setFrame((current) => Math.min(last, current + 1)),
      PLAYBACK_STEP_MS / speed,
    );
    return () => clearTimeout(timer);
  }, [active, frame, last, speed]);

  const seek = (to: number) => {
    setPlaying(false);
    setFrame(Math.max(0, Math.min(last, to)));
  };

  const toggle = () => {
    if (active) return setPlaying(false);
    if (frame >= last) setFrame(0);
    setPlaying(true);
  };

  return { frame, playing: active, speed, setSpeed, seek, toggle };
};
