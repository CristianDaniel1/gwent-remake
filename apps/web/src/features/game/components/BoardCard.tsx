import { defOf, type CardInstanceId, type GameState } from '@gwent/engine';
import { sfx } from '@/shared/audio/audio-manager';
import { useCardText } from '@/shared/i18n/useCardText';
import { GameCard, type GameCardProps } from '@/shared/ui/GameCard';
import { useReleaseHover } from '../hooks/useReleaseHover';
import { useUiStore } from '../store/ui.store';
import { type CardListView } from '../interfaces/ui-store';
import { CardAnimation } from './animations/CardAnimation';

interface BoardCardProps extends Pick<
  GameCardProps,
  'power' | 'onClick' | 'selected' | 'highlighted' | 'focused' | 'size' | 'className' | 'lift'
> {
  state: GameState;
  id: CardInstanceId;
  hoverSound?: boolean;
  details?: Omit<CardListView, 'startId'>;
  detailsOnClick?: boolean;
}

export const BoardCard = ({
  state,
  id,
  hoverSound,
  details,
  detailsOnClick = true,
  onClick,
  ...props
}: BoardCardProps) => {
  const def = defOf(state, id);
  const cardText = useCardText();
  const hover = useUiStore((store) => store.hover);
  const view = useUiStore((store) => store.view);
  useReleaseHover(id);

  const openDetails = details
    ? () => {
        sfx.play('open');
        view({ ...details, startId: id });
      }
    : undefined;
  const click = onClick ?? (detailsOnClick ? openDetails : undefined);

  return (
    <GameCard
      def={def}
      label={cardText(def).name}
      layoutId={id}
      overlay={<CardAnimation id={id} />}
      onHoverChange={(hovering) => {
        hover(hovering ? id : null);
        if (hovering && hoverSound) sfx.play('ui_card');
      }}
      {...(click ? { onClick: click } : {})}
      {...(openDetails
        ? {
            onContextMenu: (event) => {
              event.preventDefault();
              openDetails();
            },
          }
        : {})}
      {...props}
    />
  );
};
