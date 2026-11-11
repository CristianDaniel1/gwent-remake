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
  special: [ROW_X + 51, 0, 144, ROW_H],
  cards: [ROW_X + 201, 0, 803, ROW_H],
  weather: [ROW_X + 58, 6, 950, ROW_H],
} as const satisfies Record<string, Rect>;
export const ROW_FRAME: Rect = [ROW_X, 0, ROW_W, ROW_H];

/**
 * Center of each row's score coin, measured on board.jpg (they are not evenly spaced,
 * so a fixed offset inside the row leaves the number off-center).
 */
export const ROW_COINS: Record<'top' | 'bottom', Record<CombatRow, readonly [number, number]>> = {
  top: { siege: [536.5, 73], ranged: [536.5, 204], close: [536.5, 342.5] },
  bottom: { close: [535.5, 491.5], ranged: [535.5, 624.5], siege: [535.5, 762.5] },
};
const COIN = 50;
/** Square around a coin center. */
export const coinRect = ([cx, cy]: readonly [number, number], size = COIN): Rect => [
  cx - size / 2,
  cy - size / 2,
  size,
  size,
];

export const LAYOUT = {
  hand: [580, 843, 932, 128],
  weather: [142, 445, 279, 138],
  stats: { top: [0, 263, 450, 135], bottom: [0, 666, 450, 135] },
  leader: { top: [140, 82, 101, 135], bottom: [140, 834, 101, 135] },
  leaderActive: { top: [260, 134, 38, 38], bottom: [260, 886, 38, 38] },
  pass: [321, 884, 102, 43],
  /** The opponent's hand is not drawn: its cards come from (and go to) the opponent's panel. */
  opponentHand: [128, 263, 101, 135],
  grave: { top: [1543, 70, 111, 146], bottom: [1543, 826, 111, 146] },
  deck: { top: [1722, 70, 111, 146], bottom: [1722, 825, 111, 146] },
  notification: [0, 464, 1920, 151],
  exit: [19, 27, 38, 38],
  settings: [19, 80, 38, 38],
  help: [19, 133, 38, 38],
} as const satisfies Record<string, Rect | Record<string, Rect>>;

/** Round total coins, measured on board.jpg (our coin covers the one in the artwork). */
const TOTAL_COINS = { top: [452.5, 331.5], bottom: [453, 733] } as const;

/** Laurels around a total coin: twice as wide, the coin in the upper middle, the bow below. */
function laurelRect([cx, cy]: readonly [number, number]): Rect {
  const w = 112;
  const h = (w * 78) / 102; // icon_high_score.png
  return [cx - w / 2, cy - h * 0.4, w, h];
}

/**
 * Player panel parts (the top one has the name on top; the bottom one, below).
 * The portrait sits inside a round frame with the faction shield on its corner;
 * the round total is a coin on the board edge, with laurels when ahead.
 */
export const STATS_PARTS = {
  top: {
    ring: [118, 270, 118, 120],
    shield: [98, 272, 50, 54],
    name: [248, 278, 190, 26],
    faction: [248, 304, 190, 24],
    handCount: [248, 336, 72, 42],
    gems: [
      [366, 337, 40, 40],
      [324, 337, 40, 40],
    ],
    total: coinRect(TOTAL_COINS.top, 54),
    laurel: laurelRect(TOTAL_COINS.top),
  },
  bottom: {
    ring: [118, 672, 118, 120],
    shield: [98, 742, 50, 54],
    name: [248, 734, 190, 26],
    faction: [248, 760, 190, 24],
    handCount: [248, 680, 72, 42],
    gems: [
      [366, 681, 40, 40],
      [324, 681, 40, 40],
    ],
    total: coinRect(TOTAL_COINS.bottom, 54),
    laurel: laurelRect(TOTAL_COINS.bottom),
  },
} as const satisfies Record<'top' | 'bottom', Record<string, Rect | readonly Rect[]>>;

/**
 * Card enlarged on the right (hover, selection and the opponent's played card) and,
 * below it, the box with its abilities. The box grows down, over the piles.
 */
export const PREVIEW = {
  card: [1568, 228, 296, 560],
  info: [1520, 796, 392, 0],
} as const satisfies Record<string, Rect>;

/** Size of a board card (4.45% x 6.35% of the width). */
export const CARD_W_CQW = 4.45;
export const CARD_H_CQW = 6.35;
