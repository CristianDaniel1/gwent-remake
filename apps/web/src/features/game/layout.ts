// Board positions, in pixels of a 1920x1080 stage
// (each area matches the board.jpg artwork). `box()` converts to % of the stage.
import type { CSSProperties } from 'react';
import type { CombatRow } from '@gwent/engine';

export type Rect = readonly [x: number, y: number, w: number, h: number];

const STAGE_W = 1920;
const STAGE_H = 1080;

/** Absolute position in % of the stage. */
export function box([x, y, w, h]: Rect): CSSProperties {
  return {
    position: 'absolute',
    left: `${(x / STAGE_W) * 100}%`,
    top: `${(y / STAGE_H) * 100}%`,
    width: `${(w / STAGE_W) * 100}%`,
    height: `${(h / STAGE_H) * 100}%`,
  };
}

/** Absolute position in % of a parent rectangle (both in stage pixels). */
export function boxIn(parent: Rect, [x, y, w, h]: Rect): CSSProperties {
  return {
    position: 'absolute',
    left: `${((x - parent[0]) / parent[2]) * 100}%`,
    top: `${((y - parent[1]) / parent[3]) * 100}%`,
    width: `${(w / parent[2]) * 100}%`,
    height: `${(h / parent[3]) * 100}%`,
  };
}

const ROW_X = 509;
const ROW_W = 1008;
const ROW_H = 133;

/** Rows: the opponent at the top (siege on top), the player at the bottom (close in the middle). */
export const ROWS: Record<'top' | 'bottom', Record<CombatRow, Rect>> = {
  top: {
    siege: [ROW_X, 5, ROW_W, ROW_H],
    ranged: [ROW_X, 138, ROW_W, ROW_H],
    close: [ROW_X, 271, ROW_W, ROW_H],
  },
  bottom: {
    close: [ROW_X, 422, ROW_W, ROW_H],
    ranged: [ROW_X, 555, ROW_W, ROW_H],
    siege: [ROW_X, 688, ROW_W, ROW_H],
  },
};

/** Row parts, relative to the row rectangle. */
export const ROW_PARTS = {
  score: [ROW_X, 9, 51, 126],
  special: [ROW_X + 51, 0, 144, ROW_H],
  cards: [ROW_X + 201, 0, 803, ROW_H],
  weather: [ROW_X + 58, 6, 950, ROW_H],
} as const satisfies Record<string, Rect>;
export const ROW_FRAME: Rect = [ROW_X, 0, ROW_W, ROW_H];

export const LAYOUT = {
  hand: [580, 843, 932, 128],
  weather: [142, 445, 279, 138],
  stats: { top: [0, 263, 450, 135], bottom: [0, 666, 450, 135] },
  leader: { top: [140, 82, 101, 135], bottom: [140, 834, 101, 135] },
  leaderActive: { top: [260, 134, 38, 38], bottom: [260, 886, 38, 38] },
  pass: [321, 884, 102, 43],
  grave: { top: [1543, 70, 111, 146], bottom: [1543, 826, 111, 146] },
  deck: { top: [1722, 70, 111, 146], bottom: [1722, 825, 111, 146] },
  preview: [1540, 240, 340, 560],
  notification: [0, 464, 1920, 151],
  exit: [19, 27, 38, 38],
  settings: [19, 80, 38, 38],
  help: [19, 133, 38, 38],
} as const satisfies Record<string, Rect | Record<string, Rect>>;

/** Player panel parts (the top one has the name on top; the bottom one, below). */
export const STATS_PARTS = {
  top: {
    profile: [128, 276, 99, 108],
    name: [239, 271, 187, 27],
    faction: [239, 298, 187, 27],
    handCount: [240, 338, 77, 40],
    gems: [
      [360, 338, 41, 42],
      [319, 338, 41, 42],
    ],
    total: [426, 305, 54, 54],
  },
  bottom: {
    profile: [128, 679, 99, 108],
    name: [239, 747, 187, 27],
    faction: [239, 774, 187, 27],
    handCount: [240, 691, 77, 40],
    gems: [
      [360, 685, 41, 42],
      [319, 685, 41, 42],
    ],
    total: [426, 708, 54, 54],
  },
} as const;

/** Size of a board card (4.45% x 6.35% of the width). */
export const CARD_W_CQW = 4.45;
export const CARD_H_CQW = 6.35;
