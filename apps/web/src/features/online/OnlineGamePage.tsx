import { Eye } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { Board, useGameSounds, useGameStore } from '@/features/game';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useOnlineStore } from './store/online.store';

/** Multiplayer table: the same board, with the state coming from the server. */
export function OnlineGamePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const match = useGameStore((s) => s.match);
  const clearMatch = useGameStore((s) => s.leave);
  const { room, phase, closedReason, rematch, leave, resume } = useOnlineStore(
    useShallow((s) => ({
      room: s.room,
      phase: s.phase,
      closedReason: s.closedReason,
      rematch: s.rematch,
      leave: s.leave,
      resume: s.resume,
    })),
  );
  useGameSounds();

  // No online match in memory (e.g. reloaded page): try to get back into the room.
  const hasMatch = match?.mode === 'online';
  useEffect(() => {
    if (hasMatch) return;
    void resume().then((ok) => {
      if (!ok) void navigate('/online', { replace: true });
    });
  }, [hasMatch, resume, navigate]);

  if (match?.mode !== 'online') return null;

  const me = room?.seats[match.human];
  const opponent = room?.seats[match.opponent];
  const rematchNote = me?.wantsRematch
    ? t('online.rematchWaiting')
    : opponent?.wantsRematch
      ? t('online.rematchOffered', { name: opponent.name })
      : null;

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
      playAgainLabel={t('online.rematch')}
      endNote={rematchNote}
      overlay={
        <>
          {/* Players know when someone is watching */}
          {(room?.spectators ?? 0) > 0 && (
            <p className="absolute top-[1%] right-[22%] z-40 flex items-center gap-[0.3cqw] rounded border border-gold/40 bg-ink/85 px-[0.6cqw] py-[0.2cqw] text-[0.95cqw] text-[tan]">
              <Eye aria-hidden className="size-[1cqw]" />
              {t('online.spectators', { count: room?.spectators ?? 0 })}
            </p>
          )}
          {opponent && !opponent.connected && phase !== 'closed' && (
            <p
              role="status"
              className="absolute top-[1%] left-1/2 z-40 -translate-x-1/2 rounded border border-gold/50 bg-ink/90 px-[1cqw] py-[0.4cqw] text-[1.1cqw]"
            >
              {t('online.opponentDisconnected', { name: opponent.name })}
            </p>
          )}
          <AnimatePresence>
            {phase === 'closed' && closedReason && (
              <Modal
                key="closed"
                title={t(`online.closed.${closedReason}`)}
                footer={
                  <Button onClick={() => exitTo('/online')}>{t('online.backToLobby')}</Button>
                }
              >
                {null}
              </Modal>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
