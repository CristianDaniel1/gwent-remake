import type { Slot } from '../interfaces/carousel';

/** Invisible slot where cards wait outside the carousel. */
export const HIDDEN_SLOT: Slot = { x: 92, w: 9, h: 17, opacity: 0 };

/** Position and size of the carousel cards by distance to the center. */
export const SLOTS: readonly Slot[] = [
  { x: 50, w: 16.1, h: 30.4, opacity: 1 },
  { x: 66.5, w: 13.75, h: 25.9, opacity: 1 },
  { x: 81, w: 11.3, h: 21.3, opacity: 1 },
  HIDDEN_SLOT,
];

/** Largest distance to the center that is drawn. */
export const VISIBLE_DISTANCE = SLOTS.length - 1;
