/**
 * Controller reading (Gamepad API) without the DOM: turns the raw button state into
 * "pressed / released / repeated" events, so it can be tested without a real controller.
 * Uses the standard mapping (Xbox / PlayStation through the browser).
 */

export type PadControl =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'lb'
  | 'rb'
  | 'lt'
  | 'rt'
  | 'back'
  | 'start';

export interface PadSnapshot {
  buttons: readonly boolean[];
  axes: readonly number[];
}

export interface PadEvent {
  control: PadControl;
  type: 'press' | 'release' | 'repeat';
}

/** Indices of the Gamepad API "standard mapping". */
const BUTTONS: Array<[index: number, control: PadControl]> = [
  [0, 'a'],
  [1, 'b'],
  [2, 'x'],
  [3, 'y'],
  [4, 'lb'],
  [5, 'rb'],
  [6, 'lt'],
  [7, 'rt'],
  [8, 'back'],
  [9, 'start'],
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
];

/** The stick must pass the halfway point to count as a direction. */
const DEADZONE = 0.5;

/** Controls pressed now (the left stick counts as a d-pad). */
export function pressedControls(pad: PadSnapshot): Set<PadControl> {
  const pressed = new Set<PadControl>();
  for (const [index, control] of BUTTONS) if (pad.buttons[index]) pressed.add(control);
  const [x = 0, y = 0] = pad.axes;
  if (Math.abs(x) > DEADZONE || Math.abs(y) > DEADZONE) {
    // Only the dominant axis: a diagonal on the stick does not move in two directions
    if (Math.abs(x) >= Math.abs(y)) pressed.add(x < 0 ? 'left' : 'right');
    else pressed.add(y < 0 ? 'up' : 'down');
  }
  return pressed;
}

/** Holding a direction (or LB/RB) repeats, like a held key. */
const REPEATS = new Set<PadControl>(['up', 'down', 'left', 'right', 'lb', 'rb']);
export const REPEAT_DELAY_MS = 350;
export const REPEAT_EVERY_MS = 120;

/** Compares consecutive readings and produces the events. */
export class PadTracker {
  private held = new Map<PadControl, number>();

  update(pressed: ReadonlySet<PadControl>, now: number): PadEvent[] {
    const events: PadEvent[] = [];
    for (const control of pressed) {
      const next = this.held.get(control);
      if (next === undefined) {
        events.push({ control, type: 'press' });
        this.held.set(control, REPEATS.has(control) ? now + REPEAT_DELAY_MS : Infinity);
      } else if (now >= next) {
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

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Spatial navigation: among the candidates, the closest one in the requested direction (the sideways
 * offset weighs more than the distance ahead). -1 when there is none in that direction.
 */
export function nextInDirection(from: Box, candidates: readonly Box[], direction: Direction) {
  const cx = from.x + from.width / 2;
  const cy = from.y + from.height / 2;
  let best = -1;
  let bestScore = Infinity;
  candidates.forEach((box, i) => {
    const bx = box.x + box.width / 2;
    const by = box.y + box.height / 2;
    const dx = bx - cx;
    const dy = by - cy;
    const [ahead, side] =
      direction === 'left'
        ? [-dx, dy]
        : direction === 'right'
          ? [dx, dy]
          : direction === 'up'
            ? [-dy, dx]
            : [dy, dx];
    if (ahead <= 1) return;
    const score = ahead + Math.abs(side) * 2;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}
