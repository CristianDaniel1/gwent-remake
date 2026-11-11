/** Interface state when a match starts. */
export const INITIAL_UI_STATE = {
  selected: null,
  hovered: null,
  viewing: null,
  focusIndex: null,
  targetIndex: 0,
  passHolding: false,
  helpOpen: false,
} as const;
