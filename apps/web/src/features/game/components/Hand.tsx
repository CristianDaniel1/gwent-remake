import type { CardInstanceId, GameState, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { box, LAYOUT } from '../layout';
import { useUiStore } from '../store/ui.store';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';

const HAND_WIDTH_CQW = LAYOUT.hand[2] / 19.2;

type HandProps = {
  state: GameState;
  player: PlayerId;
  /** Cards that can be played now (the others are view-only). */
  playable: ReadonlySet<CardInstanceId>;
};

export function Hand({ state, player, playable }: HandProps) {
  const { t } = useTranslation();
  const selected = useUiStore((s) => s.selected);
  const focusIndex = useUiStore((s) => s.focusIndex);
  const toggleSelected = useUiStore((s) => s.toggleSelected);
  const hand = state.players[player].hand;
  const faction = state.players[player].faction;
  // A spectator does not know the cards in hand: only their backs are shown
  const known = hand.filter((id) => state.cards[id]);

  return (
    <section
      style={box(LAYOUT.hand)}
      aria-label={t('match.cardsInHand', { count: hand.length })}
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
              focused={selected === null && focusIndex !== null && hand[focusIndex] === id}
              hoverSound
              details={{ title: t('match.cardsInHand', { count: hand.length }), cardIds: known }}
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
}
