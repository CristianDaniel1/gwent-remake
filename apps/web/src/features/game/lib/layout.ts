import type { CSSProperties } from 'react';
import type { Rect } from '../interfaces/layout';
import { COIN_SIZE, LAUREL_IMAGE_RATIO, LAUREL_WIDTH, STAGE_H, STAGE_W } from '../constants/layout';

const percent = (value: number, total: number) => `${(value / total) * 100}%`;

/**
 * Converts a stage rectangle to absolute position in percent.
 *
 * @param rect - Rectangle in stage pixels.
 * @returns The position styles.
 */
export const box = ([left, top, width, height]: Rect): CSSProperties => ({
  position: 'absolute',
  left: percent(left, STAGE_W),
  top: percent(top, STAGE_H),
  width: percent(width, STAGE_W),
  height: percent(height, STAGE_H),
});

/**
 * Converts a stage rectangle to absolute position in percent, without a height.
 *
 * @param rect - Rectangle in stage pixels.
 * @returns The position styles.
 */
export const boxFrom = ([left, top, width]: Rect): CSSProperties => ({
  position: 'absolute',
  left: percent(left, STAGE_W),
  top: percent(top, STAGE_H),
  width: percent(width, STAGE_W),
});

/**
 * Converts a rectangle to absolute position in percent of a parent rectangle.
 *
 * @param parent - Parent rectangle in stage pixels.
 * @param rect - Rectangle in stage pixels.
 * @returns The position styles.
 */
export const boxIn = (
  [parentLeft, parentTop, parentWidth, parentHeight]: Rect,
  [left, top, width, height]: Rect,
): CSSProperties => ({
  position: 'absolute',
  left: percent(left - parentLeft, parentWidth),
  top: percent(top - parentTop, parentHeight),
  width: percent(width, parentWidth),
  height: percent(height, parentHeight),
});

/**
 * Builds the square around a coin center.
 *
 * @param center - Coin center in stage pixels.
 * @param size - Side of the square.
 * @returns The coin rectangle.
 */
export const coinRect = ([centerX, centerY]: readonly [number, number], size = COIN_SIZE): Rect => [
  centerX - size / 2,
  centerY - size / 2,
  size,
  size,
];

/**
 * Builds the rectangle of the laurels around a coin center.
 *
 * @param center - Coin center in stage pixels.
 * @returns The laurel rectangle.
 */
export const laurelRect = ([centerX, centerY]: readonly [number, number]): Rect => {
  const height = LAUREL_WIDTH / LAUREL_IMAGE_RATIO;
  return [centerX - LAUREL_WIDTH / 2, centerY - height * 0.4, LAUREL_WIDTH, height];
};
