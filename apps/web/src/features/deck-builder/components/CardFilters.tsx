import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { type CardFilter } from '../interfaces/filters';
import { FILTER_LABELS } from '../data/filters';
import { FILTER_ICONS } from '../data/filters';
import { CARD_FILTERS } from '../data/filters';

interface CardFiltersProps {
  label: string;
  value: CardFilter;
  onChange: (filter: CardFilter) => void;
}

export const CardFilters = ({ label, value, onChange }: CardFiltersProps) => {
  const { t: translate } = useTranslation('game');
  return (
    <div role="group" aria-label={label} className="flex justify-between">
      {CARD_FILTERS.map((filter) => {
        const name = translate(FILTER_LABELS[filter] as never) as unknown as string;
        return (
          <button
            key={filter}
            type="button"
            aria-pressed={value === filter}
            aria-label={name}
            title={name}
            onClick={() => onChange(filter)}
            className={cn(
              'size-[2.2cqw] cursor-pointer bg-contain bg-center bg-no-repeat opacity-50 transition-opacity hover:opacity-90',
              value === filter && 'opacity-100 drop-shadow-[0_0_0.4cqw_var(--color-gold)]',
            )}
            style={{ backgroundImage: `url(${assets.icon(FILTER_ICONS[filter])})` }}
          />
        );
      })}
    </div>
  );
};
