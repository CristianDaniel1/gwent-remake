import type { GameState, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { box } from '../lib/layout';
import { LAYOUT } from '../data/layout';
import { useUiStore } from '../store/ui.store';
import { BoardCard } from './BoardCard';

interface PilesProps {
  state: GameState;
  player: PlayerId;
  position: 'top' | 'bottom';
}

export const Piles = ({ state, player, position }: PilesProps) => {
  const { t: translate } = useTranslation();
  const view = useUiStore((store) => store.view);
  const me = state.players[player];
  const top = me.grave.at(-1);
  const layers = Math.min(me.deck.length, 6);

  return (
    <>
      <button
        type="button"
        style={box(LAYOUT.grave[position])}
        aria-label={`${translate('match.grave')} (${me.grave.length})`}
        onClick={() => {
          if (!me.grave.length) return;
          sfx.play('open');
          view({ title: translate('match.grave'), cardIds: [...me.grave].reverse() });
        }}
        className="flex cursor-pointer items-center justify-center"
      >
        {top && <BoardCard state={state} id={top} />}
      </button>

      <div
        style={box(LAYOUT.deck[position])}
        title={`${translate('match.deck')}: ${me.deck.length}`}
      >
        <span className="sr-only">{`${translate('match.deck')}: ${me.deck.length}`}</span>
        {Array.from({ length: layers }, (_, index) => (
          <div
            key={index}
            aria-hidden
            className="absolute inset-[6%] bg-cover bg-center shadow-md"
            style={{
              backgroundImage: `url(${assets.icon(`deck_back_${me.faction}`, 'jpg')})`,
              transform: `translate(${-index * 0.04}cqw, ${-index * 0.04}cqw)`,
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
};
