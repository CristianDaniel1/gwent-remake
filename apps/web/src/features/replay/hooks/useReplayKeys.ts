import { useEffect, useLayoutEffect, useRef } from 'react';

interface ReplayKeyInput {
  frame: number;
  last: number;
  toggle: () => void;
  seek: (frame: number) => void;
}

const isTyping = (event: KeyboardEvent) =>
  !!(event.target as HTMLElement | null)?.closest?.('input, select, textarea, button');

const dialogOpen = () => !!document.querySelector('[role="dialog"]:not([aria-hidden="true"])');

/**
 * Handles the replay keyboard shortcuts.
 *
 * @param input - Current frame, last frame and playback controls.
 */
export const useReplayKeys = (input: ReplayKeyInput) => {
  const latest = useRef(input);
  useLayoutEffect(() => {
    latest.current = input;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event) || dialogOpen()) return;
      const { frame, last, toggle, seek } = latest.current;
      if (event.key === ' ' || event.key === 'Enter') toggle();
      else if (event.key === 'ArrowLeft') seek(frame - 1);
      else if (event.key === 'ArrowRight') seek(frame + 1);
      else if (event.key === 'Home') seek(0);
      else if (event.key === 'End') seek(last);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
