import type { LiveRoom } from '@gwent/shared';
import { Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnlineStore } from '../store/online.store';

/** How often the list refreshes while the lobby is open. */
const REFRESH_MS = 5000;

/** Matches being played now, each with a button to watch it. */
export function LiveMatches({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation();
  const liveRooms = useOnlineStore((s) => s.liveRooms);
  const watch = useOnlineStore((s) => s.watch);
  const [rooms, setRooms] = useState<LiveRoom[] | null>(null);

  const refresh = useCallback(async () => setRooms(await liveRooms()), [liveRooms]);

  useEffect(() => {
    let active = true;
    const load = () => void liveRooms().then((list) => active && setRooms(list));
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [liveRooms]);

  return (
    <section
      aria-labelledby="live-matches"
      className="flex w-[34cqw] flex-col gap-[0.5cqw] rounded border border-gold/30 bg-ink/70 p-[0.8cqw] text-[1cqw]"
    >
      <header className="flex items-center justify-between">
        <h2 id="live-matches" className="text-[1.15cqw] text-gold">
          {t('online.live')}
        </h2>
        <button
          type="button"
          aria-label={t('online.refresh')}
          title={t('online.refresh')}
          onClick={() => void refresh()}
          className="cursor-pointer text-gold hover:text-gold-light"
        >
          <RefreshCw aria-hidden className="size-[1.1cqw]" />
        </button>
      </header>
      {rooms?.length === 0 && <p className="text-[tan]">{t('online.noLive')}</p>}
      <ul className="flex flex-col gap-[0.3cqw]">
        {rooms?.map((room) => (
          <li key={room.code} className="flex items-center justify-between gap-[0.6cqw]">
            <span className="truncate">
              {t('online.liveMatch', { p1: room.names.p1, p2: room.names.p2 })}
              <span className="ml-[0.5cqw] text-[0.85cqw] text-[tan]">
                {room.round > 0 && t('online.liveRound', { n: room.round })}
                {room.spectators > 0 && ` · ${t('online.spectators', { count: room.spectators })}`}
              </span>
            </span>
            <button
              type="button"
              disabled={disabled}
              aria-label={t('online.watchMatch', { p1: room.names.p1, p2: room.names.p2 })}
              onClick={() => void watch(room.code)}
              className="flex shrink-0 cursor-pointer items-center gap-[0.3cqw] rounded border border-gold/60 px-[0.5cqw] py-[0.1cqw] text-gold hover:bg-gold/20 disabled:opacity-40"
            >
              <Eye aria-hidden className="size-[1cqw]" />
              {t('online.watch')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
