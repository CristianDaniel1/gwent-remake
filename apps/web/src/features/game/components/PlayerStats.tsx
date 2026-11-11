import type { PlayerState } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { box, boxIn } from '../lib/layout';
import { STATS_PARTS } from '../data/layout';
import { LAYOUT } from '../data/layout';
import { PassedLabel } from './player/PassedLabel';
import { PlayerPortrait } from './player/PlayerPortrait';
import { RoundTotal } from './player/RoundTotal';
import { TurnGlow } from './player/TurnGlow';

interface PlayerStatsProps {
  player: PlayerState;
  position: 'top' | 'bottom';
  name: string;
  total: number;
  leading: boolean;
  active: boolean;
}

const icon = (name: string) => ({ backgroundImage: `url(${assets.icon(name)})` });

export const PlayerStats = ({
  player,
  position,
  name,
  total,
  leading,
  active,
}: PlayerStatsProps) => {
  const { t: translate } = useTranslation();
  const { t: translateCards } = useTranslation('cards');
  const frame = LAYOUT.stats[position];
  const parts = STATS_PARTS[position];
  const factionName = translateCards(
    `faction.${player.faction}.name` as never,
  ) as unknown as string;
  const handLabel = translate('match.cardsInHand', { count: player.hand.length });

  return (
    <section
      style={box(frame)}
      aria-label={name}
      aria-current={active ? 'true' : undefined}
      className="bg-[linear-gradient(90deg,rgba(15,12,10,0.8),rgba(20,18,16,0.6)_70%,rgba(20,18,16,0.35))]"
    >
      <AnimatePresence>{active && <TurnGlow key="turn" />}</AnimatePresence>

      <PlayerPortrait style={boxIn(frame, parts.ring)} active={active} />
      <div
        aria-hidden
        style={{ ...boxIn(frame, parts.shield), ...icon(`deck_shield_${player.faction}`) }}
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
        style={{ ...boxIn(frame, parts.handCount), ...icon('icon_card_count') }}
        className="flex items-center bg-[length:auto_80%] bg-left bg-no-repeat pl-[2cqw] text-[1.6cqw] font-bold text-gold-light"
        title={handLabel}
      >
        <span aria-hidden>{player.hand.length}</span>
        <span className="sr-only">{handLabel}</span>
      </div>
      {parts.gems.map((gem, index) => (
        <div
          key={index}
          aria-hidden
          style={{
            ...boxIn(frame, gem),
            ...icon(player.health > index ? 'icon_gem_on' : 'icon_gem_off'),
          }}
          className="bg-contain bg-center bg-no-repeat"
        />
      ))}

      <RoundTotal
        total={total}
        label={name}
        leading={leading}
        coin={position === 'bottom' ? 'score_total_me' : 'score_total_op'}
        coinStyle={boxIn(frame, parts.total)}
        laurelStyle={boxIn(frame, parts.laurel)}
      />
      <AnimatePresence>
        {player.passed && <PassedLabel key="passed" position={position} />}
      </AnimatePresence>
    </section>
  );
};
