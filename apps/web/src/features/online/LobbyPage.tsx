import { validateDeck } from '@gwent/engine';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { selectCurrentDeck, useDecksStore } from '@/features/deck-builder';
import { useServerStatus } from '@/features/server';
import { assets } from '@/shared/lib/assets';
import { BackButton } from '@/shared/ui/BackButton';
import { Button } from '@/shared/ui/Button';
import { Stage } from '@/shared/ui/Stage';
import { JoinPanel } from './components/JoinPanel';
import { LiveMatches } from './components/LiveMatches';
import { RoomCodePanel } from './components/RoomCodePanel';
import { useOnlineStore } from './store/online.store';
import { IDLE_PHASES } from './data/phases';

export const LobbyPage = () => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const deck = useDecksStore(selectCurrentDeck);
  const { online, checking } = useServerStatus();
  const { phase, room, cancelSearch, leave, resume } = useOnlineStore(
    useShallow((store) => ({
      phase: store.phase,
      room: store.room,
      cancelSearch: store.cancelSearch,
      leave: store.leave,
      resume: store.resume,
    })),
  );

  useEffect(() => void resume(), [resume]);
  useEffect(() => {
    if (phase === 'playing') void navigate('/online/game');
    if (phase === 'watching') void navigate('/online/watch');
  }, [phase, navigate]);

  const content = () => {
    if (checking) return null;
    if (!online) return <p className="max-w-[40cqw] text-center">{translate('online.offline')}</p>;
    if (validateDeck(deck).length) {
      return (
        <div className="flex flex-col items-center gap-[0.8cqw]">
          <p>{translate('online.needDeck')}</p>
          <Button onClick={() => void navigate('/deck-builder')}>
            {translate('online.toDeckBuilder')}
          </Button>
        </div>
      );
    }
    if (phase === 'searching') {
      return (
        <div className="flex flex-col items-center gap-[1cqw]">
          <p role="status" className="animate-pulse">
            {translate('online.searching')}
          </p>
          <Button onClick={cancelSearch}>{translate('online.cancel')}</Button>
        </div>
      );
    }
    if (phase === 'waiting' && room) return <RoomCodePanel code={room.code} onCancel={leave} />;
    return <JoinPanel deck={deck} />;
  };

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2cqw] bg-black/80">
        <BackButton onClick={() => void navigate('/')} />
        <h1 className="font-serif text-[3.5cqw] text-gold">{translate('online.title')}</h1>
        {content()}
        {online && IDLE_PHASES.has(phase) && <LiveMatches disabled={phase === 'connecting'} />}
      </div>
    </Stage>
  );
};
