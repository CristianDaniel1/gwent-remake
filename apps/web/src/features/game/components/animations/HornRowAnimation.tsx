import { m } from 'motion/react';
import { ABILITY_ANIMATION_MS } from '../../constants/timings';
import { AbilityIcon } from './AbilityIcon';

export const HornRowAnimation = () => (
  <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    <m.span
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: '100%', opacity: [0, 1, 0] }}
      transition={{ duration: (ABILITY_ANIMATION_MS / 1000) * 0.8, ease: 'easeInOut', delay: 0.2 }}
      className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,215,120,0.45),transparent)]"
    />
    <span className="absolute inset-y-0 left-1/2 aspect-square -translate-x-1/2">
      <AbilityIcon anim="horn" />
    </span>
  </span>
);
