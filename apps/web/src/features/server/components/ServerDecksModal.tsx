import type { DeckList } from '@gwent/engine';
import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import {
  useDeleteDeck,
  useProfile,
  useSaveDeck,
  useServerDecks,
  useServerStatus,
} from '../api/queries';
import { ProfileForm } from './ProfileForm';

type ServerDecksModalProps = {
  /** Deck open in the deck builder (what "Save" sends). */
  current: DeckList;
  onLoad: (deck: DeckList) => void;
  onClose: () => void;
};

/** Decks stored on the server: save the current one, load or delete. */
export function ServerDecksModal({ current, onLoad, onClose }: ServerDecksModalProps) {
  const { t } = useTranslation();
  const tCards = useTranslation('cards').t;
  const { online, checking } = useServerStatus();
  const profile = useProfile();
  const decks = useServerDecks();
  const save = useSaveDeck();
  const remove = useDeleteDeck();
  const factionName = (f: string) => tCards(`faction.${f}.name` as never) as unknown as string;
  const [name, setName] = useState(() => factionName(current.faction));
  const [message, setMessage] = useState<string | null>(null);
  const nameId = useId();

  const body = () => {
    if (checking) return null;
    if (!online)
      return <p className="max-w-[34cqw] text-center text-[1cqw]">{t('server.offline')}</p>;
    if (!profile) return <ProfileForm />;
    return (
      <div className="flex w-[40cqw] flex-col gap-[0.8cqw] text-[1cqw]">
        <p className="text-[tan]">{t('server.playingAs', { name: profile.name })}</p>
        <form
          className="flex items-center gap-[0.5cqw]"
          onSubmit={(e) => {
            e.preventDefault();
            // Same name = updates the existing deck
            const existing = decks.data?.find((d) => d.name === name.trim());
            save.mutate(
              { name: name.trim(), deck: current, ...(existing ? { id: existing.id } : {}) },
              {
                onSuccess: () => setMessage(t('server.saved')),
                onError: () => setMessage(t('server.error')),
              },
            );
          }}
        >
          <label htmlFor={nameId} className="sr-only">
            {t('server.saveAs')}
          </label>
          <input
            id={nameId}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border border-gold/40 bg-ink-soft px-[0.5cqw] py-[0.2cqw]"
          />
          <Button type="submit" disabled={!name.trim() || save.isPending}>
            {t('server.save')}
          </Button>
        </form>

        {decks.data?.length === 0 && <p>{t('server.empty')}</p>}
        <ul className="flex max-h-[24cqw] flex-col gap-[0.4cqw] overflow-y-auto">
          {decks.data?.map((record) => (
            <li
              key={record.id}
              className="flex items-center gap-[0.6cqw] rounded bg-ink-soft px-[0.6cqw] py-[0.3cqw]"
            >
              <span
                aria-hidden
                className="size-[1.6cqw] bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${assets.icon(`deck_shield_${record.deck.faction}`)})`,
                }}
              />
              <span className="flex-1">
                {record.name}
                <span className="ml-[0.5cqw] text-[0.85cqw] text-[tan]">
                  {factionName(record.deck.faction)}
                </span>
              </span>
              <Button
                onClick={() => {
                  onLoad(record.deck);
                  setMessage(t('server.loaded'));
                }}
              >
                {t('server.load')}
              </Button>
              <button
                type="button"
                aria-label={`${t('server.remove')}: ${record.name}`}
                title={t('server.remove')}
                onClick={() => remove.mutate(record.id)}
                className="cursor-pointer p-[0.3cqw] hover:text-danger"
              >
                <Trash2 aria-hidden className="size-[1.2cqw]" />
              </button>
            </li>
          ))}
        </ul>
        {message && <p role="status">{message}</p>}
      </div>
    );
  };

  return (
    <Modal title={t('server.title')} footer={<Button onClick={onClose}>{t('match.close')}</Button>}>
      {body()}
    </Modal>
  );
}
