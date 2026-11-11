import type { CardInstanceId, GameState, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { box } from '../lib/layout';
import { HAND_WIDTH_CQW, LAYOUT } from '../data/layout';
import { useUiStore } from '../store/ui.store';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';

interface HandProps {
  state: GameState;
  player: PlayerId;
  playable: ReadonlySet<CardInstanceId>;
}

export const Hand = ({ state, player, playable }: HandProps) => {
  const { t: translate } = useTranslation();
  const selected = useUiStore((store) => store.selected);
  const focusIndex = useUiStore((store) => store.focusIndex);
  const toggleSelected = useUiStore((store) => store.toggleSelected);
  const hand = state.players[player].hand;
  const faction = state.players[player].faction;
  const known = hand.filter((id) => state.cards[id]);

  return (
    <section
      style={box(LAYOUT.hand)}
      aria-label={translate('match.cardsInHand', { count: hand.length })}
      className="z-10"
    >
      <CardStrip
        items={hand}
        widthCqw={HAND_WIDTH_CQW}
        getKey={(id) => id}
        renderItem={(id) =>
          !state.cards[id] ? (
            <div
              aria-hidden
              className="h-[6.35cqw] w-[4.45cqw] shrink-0 bg-cover bg-center shadow-[0_0_0.4cqw_rgba(0,0,0,0.6)]"
              style={{ backgroundImage: `url(${assets.icon(`deck_back_${faction}`, 'jpg')})` }}
            />
          ) : (
            <BoardCard
              state={state}
              id={id}
              selected={selected === id}
              focused={!selected && focusIndex !== null && hand[focusIndex] === id}
              hoverSound
              details={{
                title: translate('match.cardsInHand', { count: hand.length }),
                cardIds: known,
              }}
              detailsOnClick={false}
              {...(playable.has(id)
                ? {
                    onClick: () => {
                      if (selected !== id) sfx.play('open');
                      toggleSelected(id);
                    },
                  }
                : {})}
            />
          )
        }
      />
    </section>
  );
};
