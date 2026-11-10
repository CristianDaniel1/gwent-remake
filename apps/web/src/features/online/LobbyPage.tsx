import { validateDeck } from '@gwent/engine';
import { ROOM_CODE_LENGTH } from '@gwent/shared';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { selectCurrentDeck, useDecksStore } from '@/features/deck-builder';
import { useProfile, useServerStatus } from '@/features/server';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { Stage } from '@/shared/ui/Stage';
import { LiveMatches } from './components/LiveMatches';
import { useOnlineStore } from './store/online.store';

const INPUT = 'bg-ink-soft border-gold/40 rounded border px-[0.6cqw] py-[0.3cqw] text-[1.1cqw]';

/** Multiplayer lobby: create a room, join or watch with a code, quick match or watch a live match. */
export function LobbyPage() {
  const { t } = useTranslation();
  const tCards = useTranslation('cards').t;
  const navigate = useNavigate();
  const deck = useDecksStore(selectCurrentDeck);
  const deckOk = validateDeck(deck).length === 0;
  const profile = useProfile();
  const { online, checking } = useServerStatus();
  const {
    phase,
    room,
    error,
    createRoom,
    joinRoom,
    quickMatch,
    cancelSearch,
    leave,
    resume,
    watch,
  } = useOnlineStore(
    useShallow((s) => ({
      phase: s.phase,
      room: s.room,
      error: s.error,
      createRoom: s.createRoom,
      joinRoom: s.joinRoom,
      quickMatch: s.quickMatch,
      cancelSearch: s.cancelSearch,
      leave: s.leave,
      resume: s.resume,
      watch: s.watch,
    })),
  );
  const [name, setName] = useState(profile?.name ?? '');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const nameId = useId();
  const codeId = useId();

  // Returns to an open room (reloaded page) and goes to the table when the match starts.
  useEffect(() => void resume(), [resume]);
  useEffect(() => {
    if (phase === 'playing') void navigate('/online/game');
    if (phase === 'watching') void navigate('/online/watch');
  }, [phase, navigate]);

  const playerName = name.trim() || t('match.you');
  const busy = phase === 'connecting';

  const content = () => {
    if (checking) return null;
    if (!online) return <p className="max-w-[40cqw] text-center">{t('online.offline')}</p>;
    if (!deckOk) {
      return (
        <div className="flex flex-col items-center gap-[0.8cqw]">
          <p>{t('online.needDeck')}</p>
          <Button onClick={() => void navigate('/deck-builder')}>
            {t('online.toDeckBuilder')}
          </Button>
        </div>
      );
    }
    if (phase === 'searching') {
      return (
        <div className="flex flex-col items-center gap-[1cqw]">
          <p role="status" className="animate-pulse">
            {t('online.searching')}
          </p>
          <Button onClick={cancelSearch}>{t('online.cancel')}</Button>
        </div>
      );
    }
    if (phase === 'waiting' && room) {
      return (
        <div className="flex flex-col items-center gap-[1cqw]">
          <p>{t('online.shareCode')}</p>
          <p
            aria-label={t('online.codeLabel')}
            className="font-mono text-[5cqw] tracking-[0.4em] text-gold"
          >
            {room.code}
          </p>
          <div className="flex gap-[0.8cqw]">
            <Button
              onClick={() => {
                void navigator.clipboard?.writeText(room.code).then(() => setCopied(true));
              }}
            >
              {copied ? t('online.copied') : t('online.copy')}
            </Button>
            <Button onClick={leave}>{t('online.cancel')}</Button>
          </div>
          <p role="status" className="animate-pulse text-[tan]">
            {t('online.waiting')}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-[1.2cqw]">
        <label htmlFor={nameId} className="flex items-center gap-[0.6cqw] text-[1.1cqw]">
          {t('online.name')}
          <input
            id={nameId}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </label>
        <p className="flex items-center gap-[0.4cqw] text-[1cqw] text-[tan]">
          <span
            aria-hidden
            className="size-[1.4cqw] bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets.icon(`deck_shield_${deck.faction}`)})` }}
          />
          {t('online.deckInfo', {
            faction: tCards(`faction.${deck.faction}.name` as never) as unknown as string,
          })}
        </p>
        <div className="flex gap-[0.8cqw]">
          <Button disabled={busy} onClick={() => void quickMatch(playerName, deck, profile?.id)}>
            {t('online.quickMatch')}
          </Button>
          <Button disabled={busy} onClick={() => void createRoom(playerName, deck, profile?.id)}>
            {t('online.createRoom')}
          </Button>
        </div>
        <form
          className="flex items-center gap-[0.6cqw]"
          onSubmit={(e) => {
            e.preventDefault();
            void joinRoom(code.trim().toUpperCase(), playerName, deck, profile?.id);
          }}
        >
          <label htmlFor={codeId} className="text-[1.1cqw]">
            {t('online.orJoin')}
          </label>
          <input
            id={codeId}
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            autoCapitalize="characters"
            placeholder="ABCDE"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`${INPUT} w-[8cqw] text-center font-mono tracking-widest`}
          />
          <Button type="submit" disabled={busy || code.trim().length !== ROOM_CODE_LENGTH}>
            {t('online.joinRoom')}
          </Button>
          <Button
            disabled={busy || code.trim().length !== ROOM_CODE_LENGTH}
            onClick={() => void watch(code.trim().toUpperCase())}
          >
            {t('online.watch')}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-red-300">
            {t(`online.error.${error}`)}
          </p>
        )}
      </div>
    );
  };

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[2cqw] bg-black/80">
        <button
          type="button"
          onClick={() => void navigate('/')}
          className="absolute top-[1cqw] left-[1cqw] flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold"
        >
          <ArrowLeft aria-hidden className="size-[1.2cqw]" />
          {t('deckBuilder.back')}
        </button>
        <h1 className="font-serif text-[3.5cqw] text-gold">{t('online.title')}</h1>
        {content()}
        {online && (phase === 'idle' || phase === 'connecting' || phase === 'closed') && (
          <LiveMatches disabled={busy} />
        )}
      </div>
    </Stage>
  );
}
