import type { CardDef } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';
import { matchesFilter } from '../lib/filters';
import { type CardFilter } from '../interfaces/filters';
import { FILTER_LABELS } from '../data/filters';
import type { PanelCard } from '../interfaces/panel-cards';
import { CardFilters } from './CardFilters';
import { CardTile } from './CardTile';

interface CardPanelProps {
  title: string;
  cards: readonly PanelCard[];
  actionLabel: (name: string) => string;
  onCardClick: (def: CardDef) => void;
}

export const CardPanel = ({ title, cards, actionLabel, onCardClick }: CardPanelProps) => {
  const { t: translate } = useTranslation('game');
  const cardText = useCardText();
  const [filter, setFilter] = useState<CardFilter>('all');
  const visible = cards.filter((card) => matchesFilter(card.def, filter));

  return (
    <section aria-label={title} className="flex min-h-0 flex-col gap-[0.6cqw]">
      <header>
        <h2 className="text-[1.6cqw] text-gold-light">{title}</h2>
        <p className="text-[0.95cqw] text-[tan] uppercase">
          {translate(FILTER_LABELS[filter] as never) as unknown as string}
        </p>
      </header>
      <CardFilters label={title} value={filter} onChange={setFilter} />
      <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-[0.8cqw] overflow-y-auto pr-[0.4cqw]">
        <AnimatePresence initial={false}>
          {visible.map(({ def, count, enabled }) => (
            <CardTile
              key={def.id}
              def={def}
              count={count}
              label={actionLabel(cardText(def).name)}
              onClick={enabled ? () => onCardClick(def) : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
};
