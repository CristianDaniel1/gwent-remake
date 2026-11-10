import { opponentOf, type GameState, type PlayerId } from '@gwent/engine';
import { ArrowUpDown, Eye } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Board, playMoveSounds, useUiStore, type ReadOnlyMatch } from '@/features/game';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { Stage } from '@/shared/ui/Stage';
import { useOnlineStore } from './store/online.store';

/**
 * A live match watched as a spectator: the same read-only board, with both hands face down
 * (the server never sends them), the spectator count and a button to swap sides.
 */
export function SpectatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { phase, room, watched, leave } = useOnlineStore(
    useShallow((s) => ({ phase: s.phase, room: s.room, watched: s.watched, leave: s.leave })),
  );
  const resetUi = useUiStore((s) => s.reset);
  const [bottom, setBottom] = useState<PlayerId>('p1');

  // Not watching anything (e.g. reloaded page: spectators have no seat to resume)
  useEffect(() => {
    if (phase !== 'watching' && phase !== 'closed') void navigate('/online', { replace: true });
  }, [phase, navigate]);
  useEffect(() => resetUi(), [resetUi, bottom]);

  // Sounds of each move as it arrives
  const lastState = useRef<GameState | null>(null);
  const lastSeq = useRef(0);
  useEffect(() => {
    if (!watched || watched.seq === lastSeq.current) return;
    const previous = lastState.current;
    lastSeq.current = watched.seq;
    lastState.current = watched.state;
    if (previous) playMoveSounds(watched.events, watched.state, bottom, previous.currentPlayer);
  }, [watched, bottom]);

  const exit = () => {
    leave();
    void navigate('/online');
  };

  const names: Record<PlayerId, string> = {
    p1: room?.seats.p1?.name ?? '',
    p2: room?.seats.p2?.name ?? '',
  };
  const other = opponentOf(bottom);

  const overlay = (
    <>
      <div className="absolute top-[0.6%] left-1/2 z-40 flex -translate-x-1/2 items-center gap-[0.8cqw] rounded border border-gold/50 bg-ink/90 px-[1cqw] py-[0.35cqw] text-[1cqw]">
        <span role="status" className="flex items-center gap-[0.4cqw]">
          <span aria-hidden className="size-[0.6cqw] animate-pulse rounded-full bg-red-500" />
          {t('online.watching')}
          <span className="flex items-center gap-[0.25cqw] text-[tan]">
            <Eye aria-hidden className="size-[1cqw]" />
            {t('online.spectators', { count: room?.spectators ?? 1 })}
          </span>
        </span>
        <button
          type="button"
          aria-label={t('online.viewSide', { name: names[other] })}
          title={t('online.viewSide', { name: names[other] })}
          onClick={() => setBottom(other)}
          className="cursor-pointer text-gold hover:text-gold-light"
        >
          <ArrowUpDown aria-hidden className="size-[1.2cqw]" />
        </button>
      </div>
      <AnimatePresence>
        {phase === 'closed' && (
          <Modal
            key="closed"
            title={t('online.watchClosed')}
            footer={<Button onClick={exit}>{t('online.backToLobby')}</Button>}
          >
            {null}
          </Modal>
        )}
      </AnimatePresence>
    </>
  );

  if (!watched) {
    return (
      <Stage background={assets.board()}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1cqw] bg-black/80 text-[1.3cqw]">
          <p role="status" className="animate-pulse">
            {t('online.waitingStart')}
          </p>
          <Button onClick={exit}>{t('online.stopWatching')}</Button>
        </div>
        {overlay}
      </Stage>
    );
  }

  const match: ReadOnlyMatch = {
    mode: 'spectate',
    state: watched.state,
    human: bottom,
    opponent: other,
    humanName: names[bottom],
    opponentName: names[other],
  };
  return <Board match={match} onPlayAgain={() => undefined} onExit={exit} overlay={overlay} />;
}
