import type { CardInstanceId } from '@gwent/engine';
import { useEffect } from 'react';
import { useUiStore } from '../store/ui.store';

/**
 * Clears the hovered card when the card is unmounted.
 *
 * @param id - Card instance id.
 */
export const useReleaseHover = (id: CardInstanceId) => {
  useEffect(
    () => () => {
      const { hovered, hover } = useUiStore.getState();
      if (hovered === id) hover(null);
    },
    [id],
  );
};
