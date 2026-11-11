import type { DeckList } from '@gwent/engine';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { Button } from '@/shared/ui/Button';
import { useSaveDeck, useServerDecks } from '../api/queries';

interface SaveDeckFormProps {
  deck: DeckList;
  onResult: (message: string) => void;
}

export const SaveDeckForm = ({ deck, onResult }: SaveDeckFormProps) => {
  const { t: translate } = useTranslation();
  const factionText = useFactionText();
  const decks = useServerDecks();
  const save = useSaveDeck();
  const [name, setName] = useState(() => factionText(deck.faction));
  const nameId = useId();
  const trimmedName = name.trim();

  return (
    <form
      className="flex items-center gap-[0.5cqw]"
      onSubmit={(event) => {
        event.preventDefault();
        const existing = decks.data?.find((record) => record.name === trimmedName);
        save.mutate(
          { name: trimmedName, deck, ...(existing ? { id: existing.id } : {}) },
          {
            onSuccess: () => onResult(translate('server.saved')),
            onError: () => onResult(translate('server.error')),
          },
        );
      }}
    >
      <label htmlFor={nameId} className="sr-only">
        {translate('server.saveAs')}
      </label>
      <input
        id={nameId}
        value={name}
        maxLength={60}
        onChange={(event) => setName(event.target.value)}
        className="flex-1 rounded border border-gold/40 bg-ink-soft px-[0.5cqw] py-[0.2cqw]"
      />
      <Button type="submit" disabled={!trimmedName || save.isPending}>
        {translate('server.save')}
      </Button>
    </form>
  );
};
