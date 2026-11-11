import type { DeckList, Faction } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { FactionShield } from '@/shared/ui/FactionShield';
import { FileButton } from '@/shared/ui/FileButton';
import { downloadDeck } from '../lib/deck-file';
import { FactionPickerModal } from './FactionPickerModal';
import { HEADER_LINK } from '../constants/styles';

interface FactionHeaderProps {
  deck: DeckList;
  onFaction: (faction: Faction) => void;
  onImport: (text: string) => void;
}

export const FactionHeader = ({ deck, onFaction, onImport }: FactionHeaderProps) => {
  const { t: translate } = useTranslation('game');
  const factionText = useFactionText();
  const [picking, setPicking] = useState(false);

  return (
    <header className="flex flex-col items-center gap-[0.5cqw] text-center">
      <div className="flex items-center gap-[0.6cqw]">
        <FactionShield faction={deck.faction} className="size-[3cqw]" />
        <h1 className="text-[2cqw] font-bold text-gold-light">{factionText(deck.faction)}</h1>
      </div>
      <p className="text-[1.1cqw]">{factionText(deck.faction, 'description')}</p>
      <div className="flex gap-[2cqw]">
        <FileButton
          label={translate('deck.uploadDeck')}
          onText={onImport}
          className={HEADER_LINK}
        />
        <button type="button" className={HEADER_LINK} onClick={() => setPicking(true)}>
          {translate('deck.changeFaction')}
        </button>
        <button type="button" className={HEADER_LINK} onClick={() => downloadDeck(deck)}>
          {translate('deck.downloadDeck')}
        </button>
      </div>

      <AnimatePresence>
        {picking && (
          <FactionPickerModal
            onPick={(faction) => {
              onFaction(faction);
              setPicking(false);
            }}
          />
        )}
      </AnimatePresence>
    </header>
  );
};
