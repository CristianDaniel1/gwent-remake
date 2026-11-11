import { useEffect } from 'react';
import { nextInDirection, PadTracker, pressedControls } from './gamepad';
import type { PadControl, PadEventType } from '../interfaces/gamepad';
import { PAD_KEYS } from '../data/gamepad';
import { FOCUSABLE_SELECTOR } from '../constants/gamepad';

let keyModeScreens = 0;
/** Makes the gamepad send keyboard keys while the calling screen is mounted. */
export const useGamepadKeyMode = () => {
  useEffect(() => {
    keyModeScreens += 1;
    return () => {
      keyModeScreens -= 1;
    };
  }, []);
};

const topDialog = (): HTMLElement | null => {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  for (let index = dialogs.length - 1; index >= 0; index--) {
    const dialog = dialogs[index]!;
    if (!dialog.closest('[aria-hidden="true"], [inert]')) return dialog;
  }
  return null;
};

const focusables = (scope: ParentNode): HTMLElement[] =>
  [...scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter((element) => {
    if (element.closest('[aria-hidden="true"], [inert]')) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

const focus = (element: HTMLElement) => {
  element.focus({ focusVisible: true } as FocusOptions);
  element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

const sendKey = (type: 'keydown' | 'keyup', key: string, repeat = false) => {
  const target =
    document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
  target.dispatchEvent(new KeyboardEvent(type, { key, repeat, bubbles: true, cancelable: true }));
};

const moveFocus = (scope: ParentNode, direction: 'up' | 'down' | 'left' | 'right') => {
  const candidates = focusables(scope);
  if (!candidates.length) return;
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body || !candidates.includes(active)) {
    focus(candidates[0]!);
    return;
  }
  const others = candidates.filter((element) => element !== active);
  const next = nextInDirection(
    active.getBoundingClientRect(),
    others.map((element) => element.getBoundingClientRect()),
    direction,
  );
  if (next >= 0) focus(others[next]!);
};

const clickFocusedIn = (scope: ParentNode): boolean => {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body || !scope.contains(active))
    return false;
  active.click();
  return true;
};

const typeKey = (control: PadControl, type: PadEventType, dialog: HTMLElement | null) => {
  const key = PAD_KEYS[control];
  if (!key) return;
  if (type === 'release') {
    if (control === 'x') sendKey('keyup', key);
    return;
  }
  if (control === 'a' && type === 'press' && dialog && clickFocusedIn(dialog)) return;
  sendKey('keydown', key, type === 'repeat');
};

const navigate = (control: PadControl, type: PadEventType, dialog: HTMLElement | null) => {
  if (type === 'release') return;
  const scope: ParentNode = dialog ?? document;
  switch (control) {
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      moveFocus(scope, control);
      break;
    case 'a': {
      if (type !== 'press' || clickFocusedIn(scope)) break;
      const first = focusables(scope)[0];
      if (first) focus(first);
      break;
    }
    case 'b':
      if (type !== 'press') break;
      if (dialog) sendKey('keydown', 'Escape');
      else if (window.location.pathname !== '/') window.history.back();
      break;
  }
};

const anyPadConnected = () => [...navigator.getGamepads()].some((pad) => pad?.connected);

/** Connects the gamepad to the interface. */
export const useGamepad = () => {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return;
    const tracker = new PadTracker();
    let frame = 0;

    const poll = () => {
      const pad = [...navigator.getGamepads()].find((gamepad) => gamepad?.connected);
      const pressed = pad
        ? pressedControls({ buttons: pad.buttons.map((button) => button.pressed), axes: pad.axes })
        : new Set<PadControl>();
      for (const event of tracker.update(pressed, performance.now())) {
        const dialog = topDialog();
        const keyMode = dialog ? dialog.hasAttribute('data-carousel') : keyModeScreens > 0;
        (keyMode ? typeKey : navigate)(event.control, event.type, dialog);
      }
      frame = requestAnimationFrame(poll);
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(poll);
    };
    const stop = () => {
      if (anyPadConnected()) return;
      cancelAnimationFrame(frame);
      frame = 0;
      tracker.reset();
    };

    window.addEventListener('gamepadconnected', start);
    window.addEventListener('gamepaddisconnected', stop);
    if (anyPadConnected()) start();
    return () => {
      window.removeEventListener('gamepadconnected', start);
      window.removeEventListener('gamepaddisconnected', stop);
      cancelAnimationFrame(frame);
    };
  }, []);
};
