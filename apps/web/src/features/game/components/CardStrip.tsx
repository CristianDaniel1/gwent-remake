import type { ReactNode } from 'react';
import { CARD_W_CQW, CARD_GAP_CQW } from '../constants/layout';

interface CardStripProps<T> {
  items: readonly T[];
  widthCqw: number;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}

export const CardStrip = <T,>({ items, widthCqw, getKey, renderItem }: CardStripProps<T>) => {
  const count = items.length;
  const natural = count * CARD_W_CQW + (count - 1) * CARD_GAP_CQW;
  const spacing =
    count > 1 && natural > widthCqw ? (widthCqw - count * CARD_W_CQW) / (count - 1) : CARD_GAP_CQW;

  return (
    <div className="flex h-full w-full items-center justify-center">
      {items.map((item, index) => (
        <div
          key={getKey(item)}
          className="relative"
          style={{ marginLeft: index === 0 ? 0 : `${spacing}cqw`, zIndex: index }}
        >
          {renderItem(item)}
        </div>
      ))}
    </div>
  );
};
