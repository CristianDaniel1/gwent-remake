import type { PlayerState } from '@gwent/engine';
import { AnimatePresence, m } from 'motion/react';
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
  /** It is this player's turn (the panel glows). */
  active: boolean;
};

/** Player panel: portrait, name, faction, hand, gems, total and "passed". */
export function PlayerStats({ player, position, name, total, leading, active }: PlayerStatsProps) {
  const { t } = useTranslation();
  const tCards = useTranslation('cards').t;
  const frame = LAYOUT.stats[position];
  const parts = STATS_PARTS[position];
  const factionName = tCards(`faction.${player.faction}.name` as never) as unknown as string;
  const image = (icon: string) => ({ backgroundImage: `url(${assets.icon(icon)})` });

  return (
    <section
      style={box(frame)}
      aria-label={name}
      aria-current={active ? 'true' : undefined}
      className="bg-[linear-gradient(90deg,rgba(15,12,10,0.8),rgba(20,18,16,0.6)_70%,rgba(20,18,16,0.35))]"
    >
      {/* Turn indicator: golden edges and a warm light on the panel */}
      <AnimatePresence>
        {active && (
          <m.div
            key="turn"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="pointer-events-none absolute inset-0"
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,190,80,0.16),rgba(255,190,80,0.05)_75%,transparent)]" />
            <div className="absolute inset-x-0 top-0 h-[0.12cqw] bg-[linear-gradient(90deg,#c8963c,#ffd864_40%,rgba(255,216,100,0.2))] shadow-[0_0_0.6cqw_#ffb43c]" />
            <div className="absolute inset-x-0 bottom-0 h-[0.12cqw] bg-[linear-gradient(90deg,#c8963c,#ffd864_40%,rgba(255,216,100,0.2))] shadow-[0_0_0.6cqw_#ffb43c]" />
          </m.div>
        )}
      </AnimatePresence>

      <div style={boxIn(frame, parts.ring)}>
        <div
          aria-hidden
          className="absolute inset-[6%] rounded-full bg-[#2a2420] bg-cover bg-top bg-no-repeat"
          style={image('profile')}
        />
        <div
          aria-hidden
          className={cn(
            'absolute inset-0 bg-contain bg-center bg-no-repeat transition-[filter] duration-500',
            active && 'drop-shadow-[0_0_0.5cqw_#ffc85a]',
          )}
          style={image('icon_player_border')}
        />
      </div>
      <div
        aria-hidden
        style={{ ...boxIn(frame, parts.shield), ...image(`deck_shield_${player.faction}`) }}
        className="bg-contain bg-center bg-no-repeat drop-shadow-[0_0_0.2cqw_black]"
      />

      <div
        style={boxIn(frame, parts.name)}
        className={cn(
          'truncate text-[1.1cqw] font-bold transition-colors duration-500',
          active ? 'text-gold' : 'text-gold-light',
        )}
      >
        {name}
      </div>
      <div style={boxIn(frame, parts.faction)} className="truncate text-[0.95cqw] text-[tan]">
        {factionName}
      </div>
      <div
        style={{ ...boxIn(frame, parts.handCount), ...image('icon_card_count') }}
        className="flex items-center bg-[length:auto_80%] bg-left bg-no-repeat pl-[2cqw] text-[1.6cqw] font-bold text-gold-light"
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
            ...image(player.health > i ? 'icon_gem_on' : 'icon_gem_off'),
          }}
          className="bg-contain bg-center bg-no-repeat"
        />
      ))}

      {/* Round total: coin on the board edge, laurels when ahead */}
      <div aria-hidden style={boxIn(frame, parts.laurel)} className="pointer-events-none z-[5]">
        <AnimatePresence>
          {leading && (
            <m.div
              key="laurel"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.35 }}
              style={image('icon_high_score')}
              className="h-full w-full bg-contain bg-center bg-no-repeat"
            />
          )}
        </AnimatePresence>
      </div>
      <div
        style={{
          ...boxIn(frame, parts.total),
          ...image(position === 'bottom' ? 'score_total_me' : 'score_total_op'),
        }}
        className="score-number z-10 flex items-center justify-center bg-contain bg-center bg-no-repeat text-[1.75cqw] drop-shadow-[0_0.1cqw_0.25cqw_rgba(0,0,0,0.7)]"
      >
        <span className="sr-only">{name}: </span>
        <m.span
          key={total}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="inline-block"
        >
          {total}
        </m.span>
      </div>

      <AnimatePresence>
        {player.passed && (
          <m.div
            key="passed"
            initial={{ opacity: 0, x: '-0.6cqw' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute left-[26%] text-[1.5cqw] font-bold text-gold uppercase [text-shadow:0_0_0.4cqw_black]',
              position === 'top' ? 'top-[102%]' : '-top-[28%]',
            )}
          >
            {t('match.passed')}
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
