import type { CombatRow } from '@gwent/engine';
import { ROW_X, ROW_W, ROW_H } from '../constants/layout';
import type { Rect } from '../interfaces/layout';
import { coinRect, laurelRect } from '../lib/layout';

/** Rectangle of each combat row, by board side. */
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

/** Special slot, cards and weather areas of a row. */
export const ROW_PARTS = {
  special: [ROW_X + 51, 0, 144, ROW_H],
  cards: [ROW_X + 201, 0, 803, ROW_H],
  weather: [ROW_X + 58, 6, 950, ROW_H],
} as const satisfies Record<string, Rect>;

/** Reference rectangle of a row for its parts. */
export const ROW_FRAME: Rect = [ROW_X, 0, ROW_W, ROW_H];

/** Center of each row's score coin, by board side. */
export const ROW_COINS: Record<'top' | 'bottom', Record<CombatRow, readonly [number, number]>> = {
  top: { siege: [536.5, 73], ranged: [536.5, 204], close: [536.5, 342.5] },
  bottom: { close: [535.5, 491.5], ranged: [535.5, 624.5], siege: [535.5, 762.5] },
};

/** Rectangles of the board areas. */
export const LAYOUT = {
  hand: [580, 843, 932, 128],
  weather: [142, 445, 279, 138],
  stats: { top: [0, 263, 450, 135], bottom: [0, 666, 450, 135] },
  leader: { top: [140, 82, 101, 135], bottom: [140, 834, 101, 135] },
  leaderActive: { top: [260, 134, 38, 38], bottom: [260, 886, 38, 38] },
  pass: [321, 884, 102, 43],
  opponentHand: [128, 263, 101, 135],
  grave: { top: [1543, 70, 111, 146], bottom: [1543, 826, 111, 146] },
  deck: { top: [1722, 70, 111, 146], bottom: [1722, 825, 111, 146] },
  notification: [0, 464, 1920, 151],
  exit: [19, 27, 38, 38],
  settings: [19, 80, 38, 38],
  help: [19, 133, 38, 38],
} as const satisfies Record<string, Rect | Record<string, Rect>>;

/** Center of each player's total score coin. */
export const TOTAL_COINS = { top: [452.5, 331.5], bottom: [453, 733] } as const;

/** Rectangles of the player panel parts, by board side. */
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

/** Rectangles of the enlarged card and its abilities box. */
export const PREVIEW = {
  card: [1568, 228, 296, 560],
  info: [1520, 796, 392, 0],
} as const satisfies Record<string, Rect>;

/** Width of a row's cards area, in container width units. */
export const ROW_CARDS_WIDTH_CQW = ROW_PARTS.cards[2] / 19.2;

/** Width of the hand, in container width units. */
export const HAND_WIDTH_CQW = LAYOUT.hand[2] / 19.2;

/** Width of the weather area, in container width units. */
export const WEATHER_WIDTH_CQW = LAYOUT.weather[2] / 19.2;
