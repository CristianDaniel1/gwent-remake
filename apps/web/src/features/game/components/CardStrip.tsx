import type { ReactNode } from 'react';
import { CARD_W_CQW } from '../layout';

type CardStripProps<T> = {
  items: readonly T[];
  /** Available width in cqw (cards overlap when they do not fit). */
  widthCqw: number;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
};

const GAP_CQW = 0.15;

/** Centered row of cards; with many cards, they overlap to fit. */
export function CardStrip<T>({ items, widthCqw, getKey, renderItem }: CardStripProps<T>) {
  const n = items.length;
  const natural = n * CARD_W_CQW + (n - 1) * GAP_CQW;
  const spacing = n > 1 && natural > widthCqw ? (widthCqw - n * CARD_W_CQW) / (n - 1) : GAP_CQW;

  return (
    <div className="flex h-full w-full items-center justify-center">
      {items.map((item, i) => (
        <div
          key={getKey(item)}
          className="relative"
          style={{ marginLeft: i === 0 ? 0 : `${spacing}cqw`, zIndex: i }}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
}
