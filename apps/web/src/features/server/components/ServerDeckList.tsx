import type { DeckList } from '@gwent/engine';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { Button } from '@/shared/ui/Button';
import { FactionShield } from '@/shared/ui/FactionShield';
import { useDeleteDeck, useServerDecks } from '../api/queries';

interface ServerDeckListProps {
  onLoad: (deck: DeckList) => void;
}

export const ServerDeckList = ({ onLoad }: ServerDeckListProps) => {
  const { t: translate } = useTranslation();
  const factionText = useFactionText();
  const decks = useServerDecks();
  const remove = useDeleteDeck();

  if (decks.data && !decks.data.length) return <p>{translate('server.empty')}</p>;

  return (
    <ul className="flex max-h-[24cqw] flex-col gap-[0.4cqw] overflow-y-auto">
      {decks.data?.map((record) => (
        <li
          key={record.id}
          className="flex items-center gap-[0.6cqw] rounded bg-ink-soft px-[0.6cqw] py-[0.3cqw]"
        >
          <FactionShield faction={record.deck.faction} className="size-[1.6cqw]" />
          <span className="flex-1">
            {record.name}
            <span className="ml-[0.5cqw] text-[0.85cqw] text-[tan]">
              {factionText(record.deck.faction)}
            </span>
          </span>
          <Button onClick={() => onLoad(record.deck)}>{translate('server.load')}</Button>
          <button
            type="button"
            aria-label={`${translate('server.remove')}: ${record.name}`}
            title={translate('server.remove')}
            onClick={() => remove.mutate(record.id)}
            className="cursor-pointer p-[0.3cqw] hover:text-danger"
          >
            <Trash2 aria-hidden className="size-[1.2cqw]" />
          </button>
        </li>
      ))}
    </ul>
  );
};
