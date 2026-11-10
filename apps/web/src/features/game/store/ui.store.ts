import type { CardInstanceId } from '@gwent/engine';
import { create } from 'zustand';

/** List of cards open in a dialog (grave etc.). */
export interface CardListView {
  title: string;
  cardIds: readonly CardInstanceId[];
  /** Card that opens in the center of the carousel. */
  startId?: CardInstanceId;
}

interface UiStore {
  /** Hand card (or the leader) chosen to play. */
  selected: CardInstanceId | null;
  /** Card under the mouse (shown enlarged). */
  hovered: CardInstanceId | null;
  viewing: CardListView | null;
  confirmingExit: boolean;
  /** Keyboard: position in the hand and target chosen for the selected card. */
  focusIndex: number | null;
  targetIndex: number;
  /** Keyboard: P/F held (passing requires holding for 1 s). */
  passHolding: boolean;
  helpOpen: boolean;
  /** Selects; clicking the same card again clears the selection. */
  toggleSelected(id: CardInstanceId): void;
  clearSelected(): void;
  hover(id: CardInstanceId | null): void;
  view(list: CardListView | null): void;
  setConfirmingExit(value: boolean): void;
  setFocusIndex(index: number | null): void;
  setTargetIndex(index: number): void;
  setPassHolding(value: boolean): void;
  setHelpOpen(value: boolean): void;
  reset(): void;
}

const INITIAL = {
  selected: null,
  hovered: null,
  viewing: null,
  confirmingExit: false,
  focusIndex: null,
  targetIndex: 0,
  passHolding: false,
  helpOpen: false,
} as const;

export const useUiStore = create<UiStore>()((set) => ({
  ...INITIAL,
  toggleSelected: (id) => set((s) => ({ selected: s.selected === id ? null : id, targetIndex: 0 })),
  clearSelected: () => set({ selected: null, targetIndex: 0 }),
  hover: (hovered) => set({ hovered }),
  view: (viewing) => set({ viewing }),
  setConfirmingExit: (confirmingExit) => set({ confirmingExit }),
  setFocusIndex: (focusIndex) => set({ focusIndex }),
  setTargetIndex: (targetIndex) => set({ targetIndex }),
  setPassHolding: (passHolding) => set({ passHolding }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  reset: () => set(INITIAL),
}));
