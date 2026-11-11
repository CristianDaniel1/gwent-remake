import { useRef, type WheelEvent } from 'react';
import { WHEEL_MIN_DELTA, WHEEL_STEP_GAP_MS } from '../constants/carousel';

/**
 * Turns mouse wheel movement into single steps.
 *
 * @param onStep - Called with the step direction.
 * @returns A wheel event handler.
 */
export const useWheelStep = (onStep: (direction: 1 | -1) => void) => {
  const lastStep = useRef(0);
  return (event: WheelEvent) => {
    const now = performance.now();
    const delta = event.deltaY + event.deltaX;
    if (
      now - lastStep.current < WHEEL_STEP_GAP_MS ||
      Math.abs(event.deltaY) + Math.abs(event.deltaX) < WHEEL_MIN_DELTA
    )
      return;
    lastStep.current = now;
    onStep(delta > 0 ? 1 : -1);
  };
};
