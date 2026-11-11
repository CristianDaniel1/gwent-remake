import { useTranslation } from 'react-i18next';
import { useFactionText } from '@/shared/i18n/useFactionText';
import { FactionShield } from '@/shared/ui/FactionShield';
import { FileButton } from '@/shared/ui/FileButton';
import type { OpponentDeck } from '../interfaces/decks-store';
import { MatchOptions } from './MatchOptions';
import { UNDERLINED_LINK } from '../constants/styles';

interface OpponentPickerProps {
  opponent: OpponentDeck;
  onUpload: (text: string) => void;
  onRandom: () => void;
}

export const OpponentPicker = ({ opponent, onUpload, onRandom }: OpponentPickerProps) => {
  const { t: translate } = useTranslation();
  const { t: translateGame } = useTranslation('game');
  const factionText = useFactionText();

  return (
    <section className="flex flex-col items-center gap-[0.3cqw] text-center">
      <h2 className="text-[1.1cqw] text-gold">{translateGame('deck.opponentsDeck')}</h2>
      {opponent.kind === 'random' ? (
        <p className="text-[1cqw]">{translateGame('deck.random')}</p>
      ) : (
        <p className="flex items-center gap-[0.3cqw] text-[1cqw]">
          <FactionShield faction={opponent.deck.faction} className="size-[1.2cqw]" />
          {translate('deckBuilder.opponentCustom')}: {factionText(opponent.deck.faction)}
        </p>
      )}
      <div className="flex gap-[1cqw]">
        <FileButton
          label={translate('deckBuilder.uploadOpponent')}
          onText={onUpload}
          className={UNDERLINED_LINK}
        />
        {opponent.kind === 'custom' && (
          <button type="button" className={UNDERLINED_LINK} onClick={onRandom}>
            {translate('deckBuilder.removeOpponent')}
          </button>
        )}
      </div>
      <MatchOptions />
    </section>
  );
};
