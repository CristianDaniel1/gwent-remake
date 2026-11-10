import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import type { OpponentDeck } from '../store/decks.store';
import { FileButton } from '@/shared/ui/FileButton';
import { MatchOptions } from './MatchOptions';

type OpponentPickerProps = {
  opponent: OpponentDeck;
  onUpload: (text: string) => void;
  onRandom: () => void;
};

const LINK =
  'text-parchment cursor-pointer text-[1cqw] underline-offset-2 hover:text-gold hover:underline';

/** Bot deck (random premade or uploaded by the player), its difficulty and the match rules. */
export function OpponentPicker({ opponent, onUpload, onRandom }: OpponentPickerProps) {
  const { t } = useTranslation();
  const tGame = useTranslation('game').t;
  const tCards = useTranslation('cards').t;

  return (
    <section className="flex flex-col items-center gap-[0.3cqw] text-center">
      <h2 className="text-[1.1cqw] text-gold">{tGame('deck.opponentsDeck')}</h2>
      {opponent.kind === 'random' ? (
        <p className="text-[1cqw]">{tGame('deck.random')}</p>
      ) : (
        <p className="flex items-center gap-[0.3cqw] text-[1cqw]">
          <span
            aria-hidden
            className="size-[1.2cqw] bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${assets.icon(`deck_shield_${opponent.deck.faction}`)})`,
            }}
          />
          {t('deckBuilder.opponentCustom')}:{' '}
          {tCards(`faction.${opponent.deck.faction}.name` as never) as unknown as string}
        </p>
      )}
      <div className="flex gap-[1cqw]">
        <FileButton label={t('deckBuilder.uploadOpponent')} onText={onUpload} className={LINK} />
        {opponent.kind === 'custom' && (
          <button type="button" className={LINK} onClick={onRandom}>
            {t('deckBuilder.removeOpponent')}
          </button>
        )}
      </div>
      <MatchOptions />
    </section>
  );
}
