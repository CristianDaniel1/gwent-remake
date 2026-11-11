import { AnimatePresence, m } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { assets } from '@/shared/lib/assets';
import { box, LAYOUT } from '../layout';
import { useGameStore } from '../store/game.store';

/** Time each notification stays on screen (enough to read it). */
export const NOTICE_MS = 1400;

/** Notification banner in the middle of the board ("Your turn!", "You won the round!"…). */
export function NoticeBanner() {
  const { t } = useTranslation('game');
  const notice = useGameStore((s) => s.notices[0]);
  const dismiss = useGameStore((s) => s.dismissNotice);
  const enabled = useSettingsStore((s) => s.notifications);

  useEffect(() => {
    if (!notice) return;
    // Turned off in the settings: the queue is emptied without showing anything.
    const timer = setTimeout(dismiss, enabled ? NOTICE_MS : 0);
    return () => clearTimeout(timer);
  }, [notice, dismiss, enabled]);

  return (
    <div style={box(LAYOUT.notification)} className="pointer-events-none z-40">
      {/* One notice at a time, always in the same place (the next one waits for the exit) */}
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
              {t(`notif.${notice.key}` as never) as unknown as string}
            </m.p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
