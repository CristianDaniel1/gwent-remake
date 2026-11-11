import { useEffect } from 'react';
import { defOf, type CardInstanceId, type GameState } from '@gwent/engine';
import { GameCard, type GameCardProps } from '@/shared/ui/GameCard';
import { sfx } from '@/shared/audio/audio-manager';
import { useCardText } from '@/shared/i18n/useCardText';
import { useUiStore, type CardListView } from '../store/ui.store';
import { useGameStore } from '../store/game.store';
import { AbilityIcon, BurnAnimation, HeroFlames } from './CardAnimations';

type BoardCardProps = {
  state: GameState;
  id: CardInstanceId;
  /** Plays the "hover over card" sound (hand cards). */
  hoverSound?: boolean;
  /**
   * Card group (row, hand…) to view in detail in the carousel: opens with right-click
   * / long press and, when the card has no other action, also with a click.
   */
  details?: Omit<CardListView, 'startId'>;
  /** A plain click also opens the details (default: yes, when there is no onClick). */
  detailsOnClick?: boolean;
} & Pick<
  GameCardProps,
  'power' | 'onClick' | 'selected' | 'highlighted' | 'focused' | 'size' | 'className' | 'lift'
>;

/**
 * Card in play: the layoutId (instance id) makes Motion animate the card
 * when it changes zones (hand → row → grave).
 */
export function BoardCard({
  state,
  id,
  hoverSound,
  details,
  detailsOnClick = true,
  onClick,
  ...props
}: BoardCardProps) {
  const def = defOf(state, id);
  const cardText = useCardText();
  const hover = useUiStore((s) => s.hover);
  const view = useUiStore((s) => s.view);
  const openDetails = details
    ? () => {
        sfx.play('open');
        view({ ...details, startId: id });
      }
    : undefined;
  const click = onClick ?? (detailsOnClick ? openDetails : undefined);
  const animation = useCardAnimation(id);

  // A played card leaves from under the mouse without a "mouse leave": drop its preview
  useEffect(
    () => () => {
      if (useUiStore.getState().hovered === id) useUiStore.getState().hover(null);
    },
    [id],
  );

  return (
    <GameCard
      def={def}
      label={cardText(def).name}
      layoutId={id}
      overlay={animation}
      onHoverChange={(hovering) => {
        hover(hovering ? id : null);
        if (hovering && hoverSound) sfx.play('ui_card');
      }}
      {...(click ? { onClick: click } : {})}
      {...(openDetails
        ? {
            onContextMenu: (e) => {
              e.preventDefault();
              openDetails();
            },
          }
        : {})}
      {...props}
    />
  );
}

/** Ability animation (or burning) for a card on the board, if it has one now. */
function useCardAnimation(id: CardInstanceId) {
  const burning = useGameStore((s) => s.burning.includes(id));
  const anim = useGameStore((s) => s.animations?.cards[id]);
  const heroSeq = useGameStore((s) =>
    s.animations?.heroes.includes(id) ? s.animations.seq : undefined,
  );
  const seq = useGameStore((s) => (s.animations?.cards[id] ? s.animations.seq : undefined));
  if (burning) return <BurnAnimation />;
  if (!anim && heroSeq === undefined) return null;
  return (
    <>
      {heroSeq !== undefined && <HeroFlames key={`hero-${heroSeq}`} />}
      {anim && <AbilityIcon key={seq} anim={anim} />}
    </>
  );
}
