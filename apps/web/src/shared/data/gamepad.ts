import type { PadControl } from '../interfaces/gamepad';

/** Gamepad button index of each control (standard mapping). */
export const PAD_BUTTONS: Array<[index: number, control: PadControl]> = [
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

/** Controls that repeat while held. */
export const REPEATING_CONTROLS = new Set<PadControl>(['up', 'down', 'left', 'right', 'lb', 'rb']);

/** Keyboard key sent by each gamepad control. */
export const PAD_KEYS: Partial<Record<PadControl, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  lb: 'ArrowLeft',
  rb: 'ArrowRight',
  a: 'Enter',
  b: 'Escape',
  x: 'p',
  y: 'v',
  lt: 'l',
  rt: 'l',
  back: 'h',
  start: 'h',
};
