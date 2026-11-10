import type { CardInstanceId, GameState } from '@gwent/engine';
import { CardCarousel } from './CardCarousel';

type CardListModalProps = {
  state: GameState;
  title: string;
  cardIds: readonly CardInstanceId[];
  /** Card that opens in the center. */
  startId?: CardInstanceId | undefined;
  onClose: () => void;
};

/** View-only large cards (row, grave, hand, revealed cards). */
export function CardListModal({ state, title, cardIds, startId, onClose }: CardListModalProps) {
  return (
    <CardCarousel
      state={state}
      title={title}
      cardIds={cardIds}
      startId={startId}
      onClose={onClose}
    />
  );
}
