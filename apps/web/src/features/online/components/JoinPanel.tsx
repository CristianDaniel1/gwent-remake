import type { DeckList } from '@gwent/engine';
import { ROOM_CODE_LENGTH } from '@gwent/shared';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';
import { useProfile } from '@/features/server';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { Button } from '@/shared/ui/Button';
import { FactionShield } from '@/shared/ui/FactionShield';
import { useOnlineStore } from '../store/online.store';
import { TEXT_INPUT } from '../constants/styles';

interface JoinPanelProps {
  deck: DeckList;
}

export const JoinPanel = ({ deck }: JoinPanelProps) => {
  const { t: translate } = useTranslation();
  const factionText = useFactionText();
  const profile = useProfile();
  const { phase, error, createRoom, joinRoom, quickMatch, watch } = useOnlineStore(
    useShallow((store) => ({
      phase: store.phase,
      error: store.error,
      createRoom: store.createRoom,
      joinRoom: store.joinRoom,
      quickMatch: store.quickMatch,
      watch: store.watch,
    })),
  );
  const [name, setName] = useState(profile?.name ?? '');
  const [code, setCode] = useState('');
  const nameId = useId();
  const codeId = useId();
  const playerName = name.trim() || translate('match.you');
  const roomCode = code.trim().toUpperCase();
  const connecting = phase === 'connecting';
  const codeComplete = roomCode.length === ROOM_CODE_LENGTH;

  return (
    <div className="flex flex-col items-center gap-[1.2cqw]">
      <label htmlFor={nameId} className="flex items-center gap-[0.6cqw] text-[1.1cqw]">
        {translate('online.name')}
        <input
          id={nameId}
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          className={TEXT_INPUT}
        />
      </label>
      <p className="flex items-center gap-[0.4cqw] text-[1cqw] text-[tan]">
        <FactionShield faction={deck.faction} className="size-[1.4cqw]" />
        {translate('online.deckInfo', { faction: factionText(deck.faction) })}
      </p>
      <div className="flex gap-[0.8cqw]">
        <Button
          disabled={connecting}
          onClick={() => void quickMatch(playerName, deck, profile?.id)}
        >
          {translate('online.quickMatch')}
        </Button>
        <Button
          disabled={connecting}
          onClick={() => void createRoom(playerName, deck, profile?.id)}
        >
          {translate('online.createRoom')}
        </Button>
      </div>
      <form
        className="flex items-center gap-[0.6cqw]"
        onSubmit={(event) => {
          event.preventDefault();
          void joinRoom(roomCode, playerName, deck, profile?.id);
        }}
      >
        <label htmlFor={codeId} className="text-[1.1cqw]">
          {translate('online.orJoin')}
        </label>
        <input
          id={codeId}
          value={code}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          placeholder="ABCDE"
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className={`${TEXT_INPUT} w-[8cqw] text-center font-mono tracking-widest`}
        />
        <Button type="submit" disabled={connecting || !codeComplete}>
          {translate('online.joinRoom')}
        </Button>
        <Button disabled={connecting || !codeComplete} onClick={() => void watch(roomCode)}>
          {translate('online.watch')}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-red-300">
          {translate(`online.error.${error}`)}
        </p>
      )}
    </div>
  );
};
