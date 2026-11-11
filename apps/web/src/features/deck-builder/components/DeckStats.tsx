import { deckStats, type DeckList } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';

interface DeckStatsProps {
  deck: DeckList;
}

export const DeckStats = ({ deck }: DeckStatsProps) => {
  const { t: translate } = useTranslation('game');
  const stats = deckStats(deck);
  const rows = [
    { label: translate('deck.totalCards'), icon: 'deck_stats_count', value: stats.total },
    { label: translate('deck.unitCards'), icon: 'deck_stats_unit', value: stats.units },
    {
      label: translate('deck.specialCards'),
      icon: 'deck_stats_special',
      value: `${stats.specials}/10`,
    },
    { label: translate('deck.totalStrength'), icon: 'deck_stats_strength', value: stats.strength },
    { label: translate('deck.heroCards'), icon: 'deck_stats_hero', value: stats.heroes },
  ];

  return (
    <dl className="flex flex-col items-center gap-[0.15cqw]">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col items-center">
          <dt className="text-[0.95cqw] text-[tan]">{row.label}</dt>
          <dd className="flex items-center gap-[0.3cqw] text-[1.2cqw]">
            <span
              aria-hidden
              className="size-[1.1cqw] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${assets.icon(row.icon)})` }}
            />
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
};
