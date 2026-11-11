import { m } from 'motion/react';
import { ABILITY_ANIMATION_MS } from '../../constants/timings';

export const HeroFlames = () => (
  <m.span
    aria-hidden
    initial={{ opacity: 0 }}
    animate={{ opacity: [0, 1, 1, 0] }}
    transition={{ duration: ABILITY_ANIMATION_MS / 1000, times: [0, 0.15, 0.7, 1], delay: 0.2 }}
    className="pointer-events-none absolute inset-0 z-20"
  >
    <m.span
      initial={{ scale: 1.15 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="absolute inset-0 animate-hero-flames rounded-[0.2cqw] motion-reduce:animate-none"
    />
  </m.span>
);
