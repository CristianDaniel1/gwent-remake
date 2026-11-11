import { AnimatePresence, m } from 'motion/react';
import type { CSSProperties } from 'react';
import { assets } from '@/shared/lib/assets';

interface RoundTotalProps {
  total: number;
  label: string;
  leading: boolean;
  coin: 'score_total_me' | 'score_total_op';
  coinStyle: CSSProperties;
  laurelStyle: CSSProperties;
}

export const RoundTotal = ({
  total,
  label,
  leading,
  coin,
  coinStyle,
  laurelStyle,
}: RoundTotalProps) => (
  <>
    <div aria-hidden style={laurelStyle} className="pointer-events-none z-[5]">
      <AnimatePresence>
        {leading && (
          <m.div
            key="laurel"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.35 }}
            style={{ backgroundImage: `url(${assets.icon('icon_high_score')})` }}
            className="h-full w-full bg-contain bg-center bg-no-repeat"
          />
        )}
      </AnimatePresence>
    </div>
    <div
      style={{ ...coinStyle, backgroundImage: `url(${assets.icon(coin)})` }}
      className="score-number z-10 flex items-center justify-center bg-contain bg-center bg-no-repeat text-[1.75cqw] drop-shadow-[0_0.1cqw_0.25cqw_rgba(0,0,0,0.7)]"
    >
      <span className="sr-only">{label}: </span>
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
  </>
);
