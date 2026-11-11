import { AnimatePresence, m } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { assets } from '@/shared/lib/assets';
import { box } from '../lib/layout';
import { LAYOUT } from '../data/layout';
import { NOTICE_MS } from '../constants/timings';
import { useGameStore } from '../store/game.store';

export const NoticeBanner = () => {
  const { t: translate } = useTranslation('game');
  const notice = useGameStore((store) => store.notices[0]);
  const dismiss = useGameStore((store) => store.dismissNotice);
  const enabled = useSettingsStore((store) => store.notifications);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismiss, enabled ? NOTICE_MS : 0);
    return () => clearTimeout(timer);
  }, [notice, dismiss, enabled]);

  return (
    <div style={box(LAYOUT.notification)} className="pointer-events-none z-40">
      <AnimatePresence mode="wait">
        {notice && (
          <m.div
            key={`${notice.key}-${notice.icon}`}
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismiss}
            className="pointer-events-auto absolute inset-0 flex items-center justify-center gap-0 bg-[linear-gradient(90deg,transparent,rgba(10,10,10,0.9)_15%,rgba(10,10,10,0.9)_85%,transparent)]"
          >
            <m.div
              aria-hidden
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
              className="aspect-square h-[240%] shrink-0 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${assets.icon(notice.icon)})` }}
            />
            <m.p
              initial={{ x: '-1cqw', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="max-w-[50%] text-[2.4cqw] text-gold-light [text-shadow:0_0_0.5cqw_black]"
            >
              {translate(`notif.${notice.key}` as never) as unknown as string}
            </m.p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};
