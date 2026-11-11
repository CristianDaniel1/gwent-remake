import { useQuery } from '@tanstack/react-query';
import { Eye, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStore } from '../store/online.store';
import { LIVE_ROOMS_REFRESH_MS } from '../constants/online';

interface LiveMatchesProps {
  disabled: boolean;
}

export const LiveMatches = ({ disabled }: LiveMatchesProps) => {
  const { t: translate } = useTranslation();
  const liveRooms = useOnlineStore((store) => store.liveRooms);
  const watch = useOnlineStore((store) => store.watch);
  const { data: rooms, refetch } = useQuery({
    queryKey: ['online', 'live-rooms'],
    queryFn: liveRooms,
    refetchInterval: LIVE_ROOMS_REFRESH_MS,
  });

  return (
    <section
      aria-labelledby="live-matches"
      className="flex w-[34cqw] flex-col gap-[0.5cqw] rounded border border-gold/30 bg-ink/70 p-[0.8cqw] text-[1cqw]"
    >
      <header className="flex items-center justify-between">
        <h2 id="live-matches" className="text-[1.15cqw] text-gold">
          {translate('online.live')}
        </h2>
        <button
          type="button"
          aria-label={translate('online.refresh')}
          title={translate('online.refresh')}
          onClick={() => void refetch()}
          className="cursor-pointer text-gold hover:text-gold-light"
        >
          <RefreshCw aria-hidden className="size-[1.1cqw]" />
        </button>
      </header>
      {rooms && !rooms.length && <p className="text-[tan]">{translate('online.noLive')}</p>}
      <ul className="flex flex-col gap-[0.3cqw]">
        {rooms?.map((room) => (
          <li key={room.code} className="flex items-center justify-between gap-[0.6cqw]">
            <span className="truncate">
              {translate('online.liveMatch', { p1: room.names.p1, p2: room.names.p2 })}
              <span className="ml-[0.5cqw] text-[0.85cqw] text-[tan]">
                {room.round > 0 && translate('online.liveRound', { n: room.round })}
                {room.spectators > 0 &&
                  ` · ${translate('online.spectators', { count: room.spectators })}`}
              </span>
            </span>
            <button
              type="button"
              disabled={disabled}
              aria-label={translate('online.watchMatch', { p1: room.names.p1, p2: room.names.p2 })}
              onClick={() => void watch(room.code)}
              className="flex shrink-0 cursor-pointer items-center gap-[0.3cqw] rounded border border-gold/60 px-[0.5cqw] py-[0.1cqw] text-gold hover:bg-gold/20 disabled:opacity-40"
            >
              <Eye aria-hidden className="size-[1cqw]" />
              {translate('online.watch')}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
