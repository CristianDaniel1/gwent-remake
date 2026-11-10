import type { PlayerState } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { box, boxIn, LAYOUT, STATS_PARTS } from '../layout';

type PlayerStatsProps = {
  player: PlayerState;
  position: 'top' | 'bottom';
  name: string;
  total: number;
  /** Is ahead in the round score. */
  leading: boolean;
};

/** Player panel: portrait, name, faction, hand, gems, total and "passed". */
export function PlayerStats({ player, position, name, total, leading }: PlayerStatsProps) {
  const { t } = useTranslation();
  const tCards = useTranslation('cards').t;
  const frame = LAYOUT.stats[position];
  const parts = STATS_PARTS[position];
  const factionName = tCards(`faction.${player.faction}.name` as never) as unknown as string;

  return (
    <section
      style={box(frame)}
      aria-label={name}
      className={cn(
        'bg-[rgba(20,20,20,0.6)]',
        position === 'top' ? 'rounded-b-sm' : 'rounded-t-sm',
      )}
    >
      <div
        style={{
          ...boxIn(frame, parts.profile),
          backgroundImage: `url(${assets.icon('profile')})`,
        }}
        className="bg-contain bg-center bg-no-repeat"
      >
        <div
          className="absolute inset-[22%] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${assets.icon(`deck_shield_${player.faction}`)})` }}
        />
      </div>
      <div style={boxIn(frame, parts.name)} className="truncate text-[1.1cqw] font-bold">
        {name}
      </div>
      <div style={boxIn(frame, parts.faction)} className="truncate text-[0.95cqw] text-[tan]">
        {factionName}
      </div>
      <div
        style={{
          ...boxIn(frame, parts.handCount),
          backgroundImage: `url(${assets.icon('icon_card_count')})`,
        }}
        className="flex items-center bg-contain bg-left bg-no-repeat pl-[2.2cqw] text-[1.7cqw] font-bold"
        title={t('match.cardsInHand', { count: player.hand.length })}
      >
        <span aria-hidden>{player.hand.length}</span>
        <span className="sr-only">{t('match.cardsInHand', { count: player.hand.length })}</span>
      </div>
      {parts.gems.map((gem, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            ...boxIn(frame, gem),
            backgroundImage: `url(${assets.icon(player.health > i ? 'icon_gem_on' : 'icon_gem_off')})`,
          }}
          className="bg-contain bg-center bg-no-repeat"
        />
      ))}
      <div
        style={{
          ...boxIn(frame, parts.total),
          backgroundImage: leading
            ? `url(${assets.icon('icon_high_score')})`
            : `url(${assets.icon(position === 'bottom' ? 'score_total_me' : 'score_total_op')})`,
        }}
        className="flex scale-[1.6] items-center justify-center bg-contain bg-center bg-no-repeat text-[1.4cqw] font-bold text-black [text-shadow:0_0_5px_white]"
      >
        <span className="sr-only">{name}: </span>
        {total}
      </div>
      {player.passed && (
        <div
          className={cn(
            'absolute left-[2%] text-[1.6cqw] font-bold text-gold uppercase',
            position === 'top' ? 'top-[102%]' : '-top-[30%]',
          )}
        >
          {t('match.passed')}
        </div>
      )}
    </section>
  );
}
