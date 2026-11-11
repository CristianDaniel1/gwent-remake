import { AnimatePresence, m } from 'motion/react';
import { assets } from '@/shared/lib/assets';
import type { WeatherKind } from '../interfaces/board';
import { boxIn } from '../lib/layout';
import { ROW_FRAME } from '../data/layout';
import { ROW_PARTS } from '../data/layout';

interface WeatherOverlayProps {
  weather: WeatherKind | undefined;
}

export const WeatherOverlay = ({ weather }: WeatherOverlayProps) => (
  <div aria-hidden style={boxIn(ROW_FRAME, ROW_PARTS.weather)} className="pointer-events-none z-20">
    <AnimatePresence>
      {weather && (
        <m.div
          key={weather}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ backgroundImage: `url(${assets.icon(`overlay_${weather}`)})` }}
          className="h-full w-full bg-cover bg-bottom bg-no-repeat"
        />
      )}
    </AnimatePresence>
  </div>
);
