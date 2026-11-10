import type { CardDef } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import {
  CARD_FILTERS,
  FILTER_ICONS,
  FILTER_LABELS,
  matchesFilter,
  type CardFilter,
} from '../lib/filters';
import { CardTile } from './CardTile';

export interface PanelCard {
  def: CardDef;
  count: number;
  enabled: boolean;
}

type CardPanelProps = {
  title: string;
  cards: readonly PanelCard[];
  /** Accessible label of the click action (e.g. "Add X"). */
  actionLabel: (name: string) => string;
  onCardClick: (def: CardDef) => void;
};

/** Card column with filters (collection or deck). */
export function CardPanel({ title, cards, actionLabel, onCardClick }: CardPanelProps) {
  const { t } = useTranslation('game');
  const cardText = useCardText();
  const [filter, setFilter] = useState<CardFilter>('all');
  const visible = cards.filter((c) => matchesFilter(c.def, filter));

  return (
    <section aria-label={title} className="flex min-h-0 flex-col gap-[0.6cqw]">
      <header>
        <h2 className="text-[1.6cqw] text-gold-light">{title}</h2>
        <p className="text-[0.95cqw] text-[tan] uppercase">
          {t(FILTER_LABELS[filter] as never) as unknown as string}
        </p>
      </header>
      <div role="group" aria-label={title} className="flex justify-between">
        {CARD_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            aria-label={t(FILTER_LABELS[f] as never) as unknown as string}
            title={t(FILTER_LABELS[f] as never) as unknown as string}
            onClick={() => setFilter(f)}
            className={cn(
              'size-[2.2cqw] cursor-pointer bg-contain bg-center bg-no-repeat opacity-50 transition-opacity hover:opacity-90',
              filter === f && 'opacity-100 drop-shadow-[0_0_0.4cqw_var(--color-gold)]',
            )}
            style={{ backgroundImage: `url(${assets.icon(FILTER_ICONS[f])})` }}
          />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-[0.8cqw] overflow-y-auto pr-[0.4cqw]">
        <AnimatePresence initial={false}>
          {visible.map(({ def, count, enabled }) => {
            const name = cardText(def).name;
            return (
              <CardTile
                key={def.id}
                def={def}
                count={count}
                label={actionLabel(name)}
                onClick={enabled ? () => onCardClick(def) : undefined}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
