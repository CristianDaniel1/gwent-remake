import type { CardInstanceId } from '@gwent/engine';

export interface CardListView {
  title: string;
  cardIds: readonly CardInstanceId[];
  startId?: CardInstanceId;
}

export interface UiStore {
  selected: CardInstanceId | null;
  hovered: CardInstanceId | null;
  viewing: CardListView | null;
  focusIndex: number | null;
  targetIndex: number;
  passHolding: boolean;
  helpOpen: boolean;
  /**
   * Selects a card, or clears the selection when it is already selected.
   *
   * @param id - Card instance id.
   */
  toggleSelected(id: CardInstanceId): void;
  clearSelected(): void;
  hover(id: CardInstanceId | null): void;
  /**
   * Opens or closes the card details carousel.
   *
   * @param list - Cards to show, or null to close.
   */
  view(list: CardListView | null): void;
  setFocusIndex(index: number | null): void;
  setTargetIndex(index: number): void;
  setPassHolding(value: boolean): void;
  setHelpOpen(value: boolean): void;
  /** Restores the initial interface state. */
  reset(): void;
}
