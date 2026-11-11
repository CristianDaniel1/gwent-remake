import type { PendingChoice } from '@gwent/engine';
import { useState } from 'react';

/**
 * Tracks the options picked in a pending choice.
 *
 * @param choice - Pending choice.
 * @param send - Sends the picked option ids.
 * @returns The picked ids and the actions to toggle and confirm them.
 */
export const useChoicePicks = (choice: PendingChoice, send: (optionIds: string[]) => void) => {
  const [picked, setPicked] = useState<string[]>([]);
  const single = choice.max === 1;

  const toggle = (id: string) => {
    if (single) return send([id]);
    setPicked((current) => {
      if (current.includes(id)) return current.filter((pickedId) => pickedId !== id);
      return current.length < choice.max ? [...current, id] : current;
    });
  };

  return {
    picked,
    single,
    toggle,
    canConfirm: picked.length >= choice.min && picked.length <= choice.max,
    confirm: () => send(picked),
  };
};
