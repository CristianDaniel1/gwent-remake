import type { KeyboardCommand } from '../interfaces/keyboard';

/** Keys that move the carousel to the previous card. */
export const CAROUSEL_PREVIOUS_KEYS = new Set(['ArrowLeft', 'a']);

/** Keys that move the carousel to the next card. */
export const CAROUSEL_NEXT_KEYS = new Set(['ArrowRight', 'd']);

/** Keys that move the focus to the carousel buttons. */
export const CAROUSEL_FOOTER_KEYS = new Set(['ArrowDown', 's']);

/** Keys that move the focus back to the carousel cards. */
export const CAROUSEL_CARDS_KEYS = new Set(['ArrowUp', 'w']);

/** Keys that pick the center card. */
export const CAROUSEL_CONFIRM_KEYS = new Set(['Enter', ' ']);

/** Keys that close the carousel. */
export const CAROUSEL_CLOSE_KEYS = new Set(['Escape', 'q', 'Backspace']);

/** Match command of each key. */
export const KEY_COMMANDS: Record<string, KeyboardCommand> = {
  ArrowLeft: 'previous',
  a: 'previous',
  ArrowRight: 'next',
  d: 'next',
  ArrowUp: 'up',
  w: 'up',
  ArrowDown: 'down',
  s: 'down',
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'cancel',
  q: 'cancel',
  Backspace: 'cancel',
  v: 'details',
  z: 'details',
  l: 'leader',
  e: 'leader',
};

/** Keys that pass the round when held. */
export const PASS_KEYS = new Set(['p', 'f']);

/** Keys that toggle the shortcut legend. */
export const HELP_KEYS = new Set(['h', '?']);
