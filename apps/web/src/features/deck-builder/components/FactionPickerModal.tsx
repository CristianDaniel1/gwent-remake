import { FACTIONS, type Faction } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { assets } from '@/shared/lib/assets';
import { Modal } from '@/shared/ui/Modal';

interface FactionPickerModalProps {
  onPick: (faction: Faction) => void;
}

export const FactionPickerModal = ({ onPick }: FactionPickerModalProps) => {
  const { t: translate } = useTranslation();
  const factionText = useFactionText();
  return (
    <Modal title={translate('deckBuilder.chooseFaction')}>
      {FACTIONS.map((faction) => (
        <button
          key={faction}
          type="button"
          onClick={() => onPick(faction)}
          className="flex w-[11cqw] cursor-pointer flex-col items-center gap-[0.4cqw] rounded p-[0.6cqw] hover:bg-gold/10"
        >
          <span
            aria-hidden
            className="h-[9cqw] w-[9cqw] bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${assets.cardLg(`faction_${faction}`)})` }}
          />
          <span className="text-[1.1cqw] text-gold-light">{factionText(faction)}</span>
          <span className="text-[0.8cqw]">{factionText(faction, 'description')}</span>
        </button>
      ))}
    </Modal>
  );
};
