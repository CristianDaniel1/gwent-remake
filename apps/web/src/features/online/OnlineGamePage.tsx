import { AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Board, useGameSounds, useGameStore } from '@/features/game';
import { reportError } from '@/shared/lib/report-error';
import { RoomClosedModal } from './components/RoomClosedModal';
import { SpectatorCount } from './components/SpectatorCount';
import { useOnlineStore } from './store/online.store';

export const OnlineGamePage = () => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const match = useGameStore((store) => store.match);
  const clearMatch = useGameStore((store) => store.leave);
  const { room, phase, closedReason, rematch, leave, resume } = useOnlineStore(
    useShallow((store) => ({
      room: store.room,
      phase: store.phase,
      closedReason: store.closedReason,
      rematch: store.rematch,
      leave: store.leave,
      resume: store.resume,
    })),
  );
  useGameSounds();

  const hasMatch = match?.mode === 'online';
  useEffect(() => {
    if (hasMatch) return;
    const returnToRoom = async () => {
      try {
        const resumed = await resume();
        if (!resumed) await navigate('/online', { replace: true });
      } catch (error) {
        reportError('online game: resume', error);
      }
    };
    void returnToRoom();
  }, [hasMatch, resume, navigate]);

  if (match?.mode !== 'online') return null;

  const me = room?.seats[match.human];
  const opponent = room?.seats[match.opponent];
  const spectators = room?.spectators ?? 0;
  const rematchNote = () => {
    if (me?.wantsRematch) return translate('online.rematchWaiting');
    if (opponent?.wantsRematch) return translate('online.rematchOffered', { name: opponent.name });
    return null;
  };

  const exitTo = (path: string) => {
    leave();
    clearMatch();
    void navigate(path);
  };

  return (
    <Board
      match={match}
      onPlayAgain={rematch}
      onExit={() => exitTo('/')}
      playAgainLabel={translate('online.rematch')}
      endNote={rematchNote()}
      overlay={
        <>
          {spectators > 0 && (
            <p className="absolute top-[1%] right-[22%] z-40 rounded border border-gold/40 bg-ink/85 px-[0.6cqw] py-[0.2cqw] text-[0.95cqw]">
              <SpectatorCount count={spectators} />
            </p>
          )}
          {opponent && !opponent.connected && phase !== 'closed' && (
            <p
              role="status"
              className="absolute top-[1%] left-1/2 z-40 -translate-x-1/2 rounded border border-gold/50 bg-ink/90 px-[1cqw] py-[0.4cqw] text-[1.1cqw]"
            >
              {translate('online.opponentDisconnected', { name: opponent.name })}
            </p>
          )}
          <AnimatePresence>
            {phase === 'closed' && closedReason && (
              <RoomClosedModal
                key="closed"
                title={translate(`online.closed.${closedReason}`)}
                onBack={() => exitTo('/online')}
              />
            )}
          </AnimatePresence>
        </>
      }
    />
  );
};
