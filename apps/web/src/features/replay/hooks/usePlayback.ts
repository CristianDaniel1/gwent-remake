import { useCallback, useEffect, useState } from 'react';

/** Time between moves at 1x speed. */
export const STEP_MS = 1100;
export const SPEEDS = [0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** Position in the replay (0..last) with play/pause and speed. */
export function usePlayback(last: number) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);

  // Reaching the end stops the playback (derived, so no extra render is needed)
  const active = playing && frame < last;

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setFrame((f) => Math.min(last, f + 1)), STEP_MS / speed);
    return () => clearTimeout(timer);
  }, [active, frame, last, speed]);

  /** Jumps to a frame (and pauses: moving by hand means the viewer wants control). */
  const seek = useCallback(
    (to: number) => {
      setPlaying(false);
      setFrame(Math.max(0, Math.min(last, to)));
    },
    [last],
  );

  const toggle = useCallback(() => {
    if (active) {
      setPlaying(false);
      return;
    }
    // Playing again from the end starts over
    if (frame >= last) setFrame(0);
    setPlaying(true);
  }, [active, frame, last]);

  return { frame, playing: active, speed, setSpeed, seek, toggle };
}
