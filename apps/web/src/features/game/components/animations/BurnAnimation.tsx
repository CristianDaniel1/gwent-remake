import { m } from 'motion/react';
import { assets } from '@/shared/lib/assets';
import { BURN_SECONDS } from '../../constants/timings';

export const BurnAnimation = () => (
  <>
    <m.span
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.9, 0.6] }}
      transition={{ duration: BURN_SECONDS }}
      className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_80%,rgba(255,140,40,0.85),rgba(120,20,0,0.5)_60%,transparent)] mix-blend-screen"
    />
    <m.span
      aria-hidden
      initial={{ opacity: 0, y: '15%' }}
      animate={{ opacity: [0, 1, 1], y: ['15%', '0%', '-5%'] }}
      transition={{ duration: BURN_SECONDS }}
      className="pointer-events-none absolute inset-0 z-20 bg-cover bg-bottom bg-no-repeat mix-blend-screen"
      style={{ backgroundImage: `url(${assets.icon('anim_scorch')})` }}
    />
  </>
);
