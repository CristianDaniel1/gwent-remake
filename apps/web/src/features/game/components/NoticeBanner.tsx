import { AnimatePresence, m } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { assets } from '@/shared/lib/assets';
import { box, LAYOUT } from '../layout';
import { useGameStore } from '../store/game.store';

/** Time each notification stays on screen. */
export const NOTICE_MS = 1100;

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
      <AnimatePresence>
        {notice && (
          <m.div
            key={`${notice.key}-${notice.icon}`}
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            className="pointer-events-auto flex h-full w-full items-center justify-center gap-[2cqw] bg-[rgba(10,10,10,0.88)]"
          >
            <div
              aria-hidden
              className="aspect-square h-[85%] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${assets.icon(notice.icon)})` }}
            />
            <p className="max-w-[50%] text-[2cqw] text-gold-light">
              {t(`notif.${notice.key}` as never) as unknown as string}
            </p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
