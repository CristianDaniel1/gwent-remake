import { FACTIONS, type DeckList, type Faction } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { Modal } from '@/shared/ui/Modal';
import { downloadDeck } from '../lib/deck-file';
import { FileButton } from '@/shared/ui/FileButton';

type FactionHeaderProps = {
  deck: DeckList;
  onFaction: (faction: Faction) => void;
  onImport: (text: string) => void;
};

const LINK = 'text-parchment cursor-pointer text-[1.05cqw] hover:text-gold';

export function FactionHeader({ deck, onFaction, onImport }: FactionHeaderProps) {
  const { t } = useTranslation();
  const tGame = useTranslation('game').t;
  const tCards = useTranslation('cards').t;
  const [picking, setPicking] = useState(false);
  const factionText = (f: Faction, part: 'name' | 'description') =>
    tCards(`faction.${f}.${part}` as never) as unknown as string;

  return (
    <header className="flex flex-col items-center gap-[0.5cqw] text-center">
      <div className="flex items-center gap-[0.6cqw]">
        <span
          aria-hidden
          className="size-[3cqw] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${assets.icon(`deck_shield_${deck.faction}`)})` }}
        />
        <h1 className="text-[2cqw] font-bold text-gold-light">
          {factionText(deck.faction, 'name')}
        </h1>
      </div>
      <p className="text-[1.1cqw]">{factionText(deck.faction, 'description')}</p>
      <div className="flex gap-[2cqw]">
        <FileButton label={tGame('deck.uploadDeck')} onText={onImport} className={LINK} />
        <button type="button" className={LINK} onClick={() => setPicking(true)}>
          {tGame('deck.changeFaction')}
        </button>
        <button type="button" className={LINK} onClick={() => downloadDeck(deck)}>
          {tGame('deck.downloadDeck')}
        </button>
      </div>

      <AnimatePresence>
        {picking && (
          <Modal title={t('deckBuilder.chooseFaction')}>
            {FACTIONS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  onFaction(f);
                  setPicking(false);
                }}
                className="flex w-[11cqw] cursor-pointer flex-col items-center gap-[0.4cqw] rounded p-[0.6cqw] hover:bg-gold/10"
              >
                <span
                  aria-hidden
                  className="h-[9cqw] w-[9cqw] bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${assets.cardLg(`faction_${f}`)})` }}
                />
                <span className="text-[1.1cqw] text-gold-light">{factionText(f, 'name')}</span>
                <span className="text-[0.8cqw]">{factionText(f, 'description')}</span>
              </button>
            ))}
          </Modal>
        )}
      </AnimatePresence>
    </header>
  );
}
