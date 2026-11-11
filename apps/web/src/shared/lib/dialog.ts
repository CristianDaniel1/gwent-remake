import { HIDDEN_TREE_SELECTOR } from '../constants/dialog';

/**
 * Tells whether an element is hidden by itself or by a container (aria-hidden or inert).
 *
 * @param element - Element to check.
 * @returns True when the element is not available to the player.
 */
export const isInHiddenTree = (element: Element): boolean =>
  !!element.closest(HIDDEN_TREE_SELECTOR);

/**
 * Tells whether a dialog the player can use is open. A dialog leaving the screen (inside a hidden
 * container) does not count, so keys pressed right after closing it are not lost.
 *
 * @returns True when a visible dialog is open.
 */
export const isDialogOpen = (): boolean =>
  [...document.querySelectorAll('[role="dialog"]')].some((dialog) => !isInHiddenTree(dialog));
