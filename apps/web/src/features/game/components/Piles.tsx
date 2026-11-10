import type { GameState, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { box, LAYOUT } from '../layout';
import { useUiStore } from '../store/ui.store';
import { BoardCard } from './BoardCard';

type PilesProps = { state: GameState; player: PlayerId; position: 'top' | 'bottom' };

/** Deck (back + count) and grave (top card; click to see all). */
export function Piles({ state, player, position }: PilesProps) {
  const { t } = useTranslation();
  const view = useUiStore((s) => s.view);
  const me = state.players[player];
  const top = me.grave.at(-1);
  // Visual pile: a few offset layers
  const layers = Math.min(me.deck.length, 6);

  return (
    <>
      <button
        type="button"
        style={box(LAYOUT.grave[position])}
        aria-label={`${t('match.grave')} (${me.grave.length})`}
        onClick={() => {
          if (me.grave.length === 0) return;
          sfx.play('open');
          view({ title: t('match.grave'), cardIds: [...me.grave].reverse() });
        }}
        className="flex cursor-pointer items-center justify-center"
      >
        {top && <BoardCard state={state} id={top} />}
      </button>

      <div style={box(LAYOUT.deck[position])} title={`${t('match.deck')}: ${me.deck.length}`}>
        <span className="sr-only">{`${t('match.deck')}: ${me.deck.length}`}</span>
        {Array.from({ length: layers }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className="absolute inset-[6%] bg-cover bg-center shadow-md"
            style={{
              backgroundImage: `url(${assets.icon(`deck_back_${me.faction}`, 'jpg')})`,
              transform: `translate(${-i * 0.04}cqw, ${-i * 0.04}cqw)`,
            }}
          />
        ))}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-[8%] text-center text-[1.4cqw] font-bold [text-shadow:0_0_4px_black]"
        >
          {me.deck.length}
        </div>
      </div>
    </>
  );
}
