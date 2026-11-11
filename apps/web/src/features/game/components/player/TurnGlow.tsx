import { m } from 'motion/react';
import { TURN_GLOW_EDGE } from '../../constants/styles';

export const TurnGlow = () => (
  <m.div
    aria-hidden
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4 }}
    className="pointer-events-none absolute inset-0"
  >
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,190,80,0.16),rgba(255,190,80,0.05)_75%,transparent)]" />
    <div className={`${TURN_GLOW_EDGE} top-0`} />
    <div className={`${TURN_GLOW_EDGE} bottom-0`} />
  </m.div>
);
