import { STICK_DEADZONE, REPEAT_DELAY_MS, REPEAT_EVERY_MS } from '../constants/gamepad';
import { PAD_BUTTONS, REPEATING_CONTROLS } from '../data/gamepad';
import type { Box, Direction, PadControl, PadEvent, PadSnapshot } from '../interfaces/gamepad';

/**
 * Finds the controls pressed in a gamepad reading.
 *
 * @param pad - Buttons and axes of the gamepad.
 * @returns The pressed controls.
 */
export const pressedControls = (pad: PadSnapshot): Set<PadControl> => {
  const pressed = new Set<PadControl>();
  for (const [index, control] of PAD_BUTTONS) if (pad.buttons[index]) pressed.add(control);
  const [horizontal = 0, vertical = 0] = pad.axes;
  if (Math.abs(horizontal) > STICK_DEADZONE || Math.abs(vertical) > STICK_DEADZONE) {
    if (Math.abs(horizontal) >= Math.abs(vertical)) pressed.add(horizontal < 0 ? 'left' : 'right');
    else pressed.add(vertical < 0 ? 'up' : 'down');
  }
  return pressed;
};

/** Turns consecutive gamepad readings into press, repeat and release events. */
export class PadTracker {
  private held = new Map<PadControl, number>();

  update(pressed: ReadonlySet<PadControl>, now: number): PadEvent[] {
    const events: PadEvent[] = [];
    for (const control of pressed) {
      const repeatAt = this.held.get(control) ?? Infinity;
      if (!this.held.has(control)) {
        events.push({ control, type: 'press' });
        this.held.set(control, REPEATING_CONTROLS.has(control) ? now + REPEAT_DELAY_MS : Infinity);
      } else if (now >= repeatAt) {
        events.push({ control, type: 'repeat' });
        this.held.set(control, now + REPEAT_EVERY_MS);
      }
    }
    for (const control of [...this.held.keys()]) {
      if (!pressed.has(control)) {
        this.held.delete(control);
        events.push({ control, type: 'release' });
      }
    }
    return events;
  }

  reset() {
    this.held.clear();
  }
}

const directionAxes = (direction: Direction, deltaX: number, deltaY: number): [number, number] => {
  switch (direction) {
    case 'left':
      return [-deltaX, deltaY];
    case 'right':
      return [deltaX, deltaY];
    case 'up':
      return [-deltaY, deltaX];
    case 'down':
      return [deltaY, deltaX];
  }
};

const centerOf = (box: Box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

const directionScore = (from: Box, candidate: Box, direction: Direction): number | null => {
  const start = centerOf(from);
  const end = centerOf(candidate);
  const [ahead, side] = directionAxes(direction, end.x - start.x, end.y - start.y);
  if (ahead <= 1) return null;
  return ahead + Math.abs(side) * 2;
};

/**
 * Finds the closest candidate in a direction.
 *
 * @param from - Box of the focused element.
 * @param candidates - Boxes of the other elements.
 * @param direction - Direction to move.
 * @returns The candidate index, or -1.
 */
export const nextInDirection = (from: Box, candidates: readonly Box[], direction: Direction) => {
  let best = -1;
  let bestScore = Infinity;
  for (const [index, box] of candidates.entries()) {
    const score = directionScore(from, box, direction);
    if (score !== null && score < bestScore) {
      bestScore = score;
      best = index;
    }
  }
  return best;
};
