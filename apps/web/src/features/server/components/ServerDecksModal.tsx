import type { DeckList } from '@gwent/engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useProfile, useServerStatus } from '../api/queries';
import { ProfileForm } from './ProfileForm';
import { SaveDeckForm } from './SaveDeckForm';
import { ServerDeckList } from './ServerDeckList';

interface ServerDecksModalProps {
  current: DeckList;
  onLoad: (deck: DeckList) => void;
  onClose: () => void;
}

export const ServerDecksModal = ({ current, onLoad, onClose }: ServerDecksModalProps) => {
  const { t: translate } = useTranslation();
  const { online, checking } = useServerStatus();
  const profile = useProfile();
  const [message, setMessage] = useState<string | null>(null);

  const body = () => {
    if (checking) return null;
    if (!online)
      return <p className="max-w-[34cqw] text-center text-[1cqw]">{translate('server.offline')}</p>;
    if (!profile) return <ProfileForm />;
    return (
      <div className="flex w-[40cqw] flex-col gap-[0.8cqw] text-[1cqw]">
        <p className="text-[tan]">{translate('server.playingAs', { name: profile.name })}</p>
        <SaveDeckForm deck={current} onResult={setMessage} />
        <ServerDeckList
          onLoad={(deck) => {
            onLoad(deck);
            setMessage(translate('server.loaded'));
          }}
        />
        {message && <p role="status">{message}</p>}
      </div>
    );
  };

  return (
    <Modal
      title={translate('server.title')}
      footer={<Button onClick={onClose}>{translate('match.close')}</Button>}
    >
      {body()}
    </Modal>
  );
};
