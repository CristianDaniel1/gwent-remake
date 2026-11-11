import { m } from 'motion/react';
import { SELECT_WAVE_LOOP } from '../constants/motion';

export const SelectWave = () => (
  <>
    <m.span
      aria-hidden
      initial={{ opacity: 0.9, scale: 1 }}
      animate={{ opacity: 0, scale: 1.35 }}
      transition={{ ...SELECT_WAVE_LOOP, ease: 'easeOut' }}
      className="pointer-events-none absolute inset-0 z-20 rounded-[0.3cqw] border-[0.2cqw] border-gold shadow-[0_0_1cqw_#ffd864]"
    />
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <m.span
        initial={{ x: '-120%' }}
        animate={{ x: '120%' }}
        transition={{ ...SELECT_WAVE_LOOP, ease: 'easeInOut' }}
        className="absolute inset-y-0 -left-1/4 w-[150%] bg-[linear-gradient(110deg,transparent_30%,rgba(255,225,140,0.75)_50%,transparent_70%)]"
      />
    </span>
  </>
);
