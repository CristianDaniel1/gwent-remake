import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

interface RoomClosedModalProps {
  title: string;
  onBack: () => void;
}

export const RoomClosedModal = ({ title, onBack }: RoomClosedModalProps) => {
  const { t: translate } = useTranslation();
  return (
    <Modal
      title={title}
      footer={<Button onClick={onBack}>{translate('online.backToLobby')}</Button>}
    >
      {null}
    </Modal>
  );
};
