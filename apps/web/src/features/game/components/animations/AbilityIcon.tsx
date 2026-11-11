import { m } from 'motion/react';
import { assets } from '@/shared/lib/assets';
import type { AbilityAnimation } from '../../interfaces/animations';
import { ABILITY_ANIMATION_MS } from '../../constants/timings';

interface AbilityIconProps {
  anim: AbilityAnimation;
}

export const AbilityIcon = ({ anim }: AbilityIconProps) => (
  <m.span
    aria-hidden
    initial={{ opacity: 0, scale: 0.4 }}
    animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
    transition={{ duration: ABILITY_ANIMATION_MS / 1000, times: [0, 0.2, 0.7, 1], delay: 0.25 }}
    className="pointer-events-none absolute inset-0 z-20 bg-[length:75%] bg-center bg-no-repeat drop-shadow-[0_0_0.4cqw_rgba(255,220,140,0.9)]"
    style={{ backgroundImage: `url(${assets.icon(`anim_${anim}`)})` }}
  />
);
