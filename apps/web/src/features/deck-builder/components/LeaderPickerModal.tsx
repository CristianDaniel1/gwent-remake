import { leadersOf, type Faction } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';
import { GameCard } from '@/shared/ui/GameCard';
import { Modal } from '@/shared/ui/Modal';

interface LeaderPickerModalProps {
  faction: Faction;
  current: number;
  onPick: (leader: number) => void;
}

export const LeaderPickerModal = ({ faction, current, onPick }: LeaderPickerModalProps) => {
  const { t: translate } = useTranslation();
  const cardText = useCardText();
  return (
    <Modal title={translate('deckBuilder.chooseLeader')}>
      {leadersOf(faction).map((def) => (
        <div key={def.id} className="flex w-[8cqw] flex-col gap-[0.4cqw]">
          <div className="h-[15.1cqw] w-full">
            <GameCard
              def={def}
              size="fill"
              label={cardText(def).name}
              selected={def.id === current}
              onClick={() => onPick(def.id)}
            />
          </div>
          <p className="text-[0.75cqw] leading-snug">{cardText(def).abilities[0]?.description}</p>
        </div>
      ))}
    </Modal>
  );
};
