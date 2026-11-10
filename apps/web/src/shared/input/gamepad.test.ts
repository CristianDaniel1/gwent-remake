import { describe, expect, it } from 'vitest';
import {
  nextInDirection,
  PadTracker,
  pressedControls,
  REPEAT_DELAY_MS,
  REPEAT_EVERY_MS,
  type PadControl,
} from './gamepad';

const pad = (pressed: number[], axes: number[] = [0, 0]) => ({
  buttons: Array.from({ length: 17 }, (_, i) => pressed.includes(i)),
  axes,
});

describe('pressedControls', () => {
  it('reads buttons from the standard mapping', () => {
    expect([...pressedControls(pad([0, 14]))].sort()).toEqual(['a', 'left']);
  });

  it('treats the stick as a d-pad, only on the dominant axis and outside the dead zone', () => {
    expect([...pressedControls(pad([], [0.9, 0.6]))]).toEqual(['right']);
    expect([...pressedControls(pad([], [0.1, -0.8]))]).toEqual(['up']);
    expect([...pressedControls(pad([], [0.3, 0.3]))]).toEqual([]);
  });
});

describe('PadTracker', () => {
  const set = (...c: PadControl[]) => new Set(c);

  it('emits press and release once each', () => {
    const tracker = new PadTracker();
    expect(tracker.update(set('a'), 0)).toEqual([{ control: 'a', type: 'press' }]);
    expect(tracker.update(set('a'), 5000)).toEqual([]);
    expect(tracker.update(set(), 5100)).toEqual([{ control: 'a', type: 'release' }]);
  });

  it('repeats a held direction after a delay', () => {
    const tracker = new PadTracker();
    tracker.update(set('right'), 0);
    expect(tracker.update(set('right'), REPEAT_DELAY_MS - 1)).toEqual([]);
    expect(tracker.update(set('right'), REPEAT_DELAY_MS)).toEqual([
      { control: 'right', type: 'repeat' },
    ]);
    expect(tracker.update(set('right'), REPEAT_DELAY_MS + REPEAT_EVERY_MS)).toEqual([
      { control: 'right', type: 'repeat' },
    ]);
  });
});

describe('nextInDirection', () => {
  const box = (x: number, y: number) => ({ x, y, width: 10, height: 10 });
  // 2x2 grid and a far button on the same line
  const grid = [box(0, 0), box(100, 0), box(0, 100), box(100, 100), box(400, 0)];

  it('prefers the aligned neighbor over a diagonal one', () => {
    expect(nextInDirection(grid[0]!, grid, 'right')).toBe(1);
    expect(nextInDirection(grid[0]!, grid, 'down')).toBe(2);
    expect(nextInDirection(grid[3]!, grid, 'up')).toBe(1);
  });

  it('returns -1 when there is nothing in that direction', () => {
    expect(nextInDirection(grid[0]!, grid, 'left')).toBe(-1);
    expect(nextInDirection(grid[0]!, grid, 'up')).toBe(-1);
  });
});
