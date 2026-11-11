import { create } from 'zustand';
import type { UiStore } from '../interfaces/ui-store';
import { INITIAL_UI_STATE } from '../constants/ui';

export const useUiStore = create<UiStore>()((set) => ({
  ...INITIAL_UI_STATE,
  toggleSelected: (id) =>
    set((current) => ({ selected: current.selected === id ? null : id, targetIndex: 0 })),
  clearSelected: () => set({ selected: null, targetIndex: 0 }),
  hover: (hovered) => set({ hovered }),
  view: (viewing) => set({ viewing }),
  setFocusIndex: (focusIndex) => set({ focusIndex }),
  setTargetIndex: (targetIndex) => set({ targetIndex }),
  setPassHolding: (passHolding) => set({ passHolding }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  reset: () => set(INITIAL_UI_STATE),
}));
