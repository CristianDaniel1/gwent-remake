import { m } from 'motion/react';
import { assets } from '@/shared/lib/assets';
import type { AbilityAnimation } from '../lib/animations';
import { BURN_MS, ABILITY_ANIMATION_MS } from '../store/game.store';

/** Ability icon that pops over a card and fades away. */
export function AbilityIcon({ anim }: { anim: AbilityAnimation }) {
  return (
    <m.span
      aria-hidden
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
      transition={{ duration: ABILITY_ANIMATION_MS / 1000, times: [0, 0.2, 0.7, 1], delay: 0.25 }}
      className="pointer-events-none absolute inset-0 z-20 bg-[length:75%] bg-center bg-no-repeat drop-shadow-[0_0_0.4cqw_rgba(255,220,140,0.9)]"
      style={{ backgroundImage: `url(${assets.icon(`anim_${anim}`)})` }}
    />
  );
}

/** Commander's Horn: a golden light sweeps the row and the horn icon shows in the middle. */
export function HornRowAnimation() {
  const seconds = ABILITY_ANIMATION_MS / 1000;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <m.span
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: '100%', opacity: [0, 1, 0] }}
        transition={{ duration: seconds * 0.8, ease: 'easeInOut', delay: 0.2 }}
        className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,215,120,0.45),transparent)]"
      />
      <span className="absolute inset-y-0 left-1/2 aspect-square -translate-x-1/2">
        <AbilityIcon anim="horn" />
      </span>
    </span>
  );
}

/**
 * A hero lands: flames flare up and flicker around the card, then die out
 * (they last as long as the other ability animations of the move).
 */
export function HeroFlames() {
  return (
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
}

/** Scorch: the card glows and burns before going to the grave. */
export function BurnAnimation() {
  const seconds = BURN_MS / 1000;
  return (
    <>
      <m.span
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.6] }}
        transition={{ duration: seconds }}
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_80%,rgba(255,140,40,0.85),rgba(120,20,0,0.5)_60%,transparent)] mix-blend-screen"
      />
      <m.span
        aria-hidden
        initial={{ opacity: 0, y: '15%' }}
        animate={{ opacity: [0, 1, 1], y: ['15%', '0%', '-5%'] }}
        transition={{ duration: seconds }}
        className="pointer-events-none absolute inset-0 z-20 bg-cover bg-bottom bg-no-repeat mix-blend-screen"
        style={{ backgroundImage: `url(${assets.icon('anim_scorch')})` }}
      />
    </>
  );
}
