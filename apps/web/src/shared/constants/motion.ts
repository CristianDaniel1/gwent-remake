import { type Transition } from 'motion/react';

/** Transition of a card moving between zones. */
export const CARD_LAYOUT_TRANSITION: Transition = {
  layout: { duration: 0.55, ease: [0.25, 0.8, 0.3, 1] },
};

/** Loop timing of the selected card wave. */
export const SELECT_WAVE_LOOP = { duration: 0.9, repeat: Infinity, repeatDelay: 0.5 } as const;
