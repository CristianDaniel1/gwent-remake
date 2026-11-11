import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

interface ExitConfirmModalProps {
  onExit: () => void;
  onResume: () => void;
}

export const ExitConfirmModal = ({ onExit, onResume }: ExitConfirmModalProps) => {
  const { t: translate } = useTranslation();
  const { t: translateGame } = useTranslation('game');
  return (
    <Modal
      title={translate('match.exit')}
      footer={
        <>
          <Button onClick={onExit}>{translateGame('game.exit')}</Button>
          <Button onClick={onResume}>{translateGame('game.resume')}</Button>
        </>
      }
    >
      <p className="text-[1.1cqw]">{translateGame('game.quitBody')}</p>
    </Modal>
  );
};
