import { opponentOf, type PlayerId } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Board, useUiStore, type ReadOnlyMatch } from '@/features/game';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { Stage } from '@/shared/ui/Stage';
import { RoomClosedModal } from './components/RoomClosedModal';
import { SpectatorBar } from './components/SpectatorBar';
import { useSpectatorSounds } from './hooks/useSpectatorSounds';
import { useOnlineStore } from './store/online.store';

export const SpectatePage = () => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const { phase, room, watched, leave } = useOnlineStore(
    useShallow((store) => ({
      phase: store.phase,
      room: store.room,
      watched: store.watched,
      leave: store.leave,
    })),
  );
  const resetUi = useUiStore((store) => store.reset);
  const [bottom, setBottom] = useState<PlayerId>('p1');
  const other = opponentOf(bottom);
  useSpectatorSounds(watched, bottom);

  useEffect(() => {
    if (phase !== 'watching' && phase !== 'closed') void navigate('/online', { replace: true });
  }, [phase, navigate]);
  useEffect(() => resetUi(), [resetUi, bottom]);

  const exit = () => {
    leave();
    void navigate('/online');
  };
  const names: Record<PlayerId, string> = {
    p1: room?.seats.p1?.name ?? '',
    p2: room?.seats.p2?.name ?? '',
  };

  const overlay = (
    <>
      <SpectatorBar
        spectators={room?.spectators ?? 1}
        otherName={names[other]}
        onSwapSides={() => setBottom(other)}
      />
      <AnimatePresence>
        {phase === 'closed' && (
          <RoomClosedModal key="closed" title={translate('online.watchClosed')} onBack={exit} />
        )}
      </AnimatePresence>
    </>
  );

  if (!watched) {
    return (
      <Stage background={assets.board()}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1cqw] bg-black/80 text-[1.3cqw]">
          <p role="status" className="animate-pulse">
            {translate('online.waitingStart')}
          </p>
          <Button onClick={exit}>{translate('online.stopWatching')}</Button>
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
};
