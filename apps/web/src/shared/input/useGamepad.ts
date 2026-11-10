import { useEffect } from 'react';
import { nextInDirection, PadTracker, pressedControls, type PadControl } from './gamepad';

/**
 * Screens that already have their own keyboard controls (the match) ask for the controller to become
 * keys; on the others, the d-pad moves focus between buttons and A clicks.
 */
let keyModeScreens = 0;
export function useGamepadKeyMode() {
  useEffect(() => {
    keyModeScreens += 1;
    return () => {
      keyModeScreens -= 1;
    };
  }, []);
}

/** Controller button → game key (same shortcuts as the keyboard). */
const KEYS: Partial<Record<PadControl, string>> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  lb: 'ArrowLeft',
  rb: 'ArrowRight',
  a: 'Enter',
  b: 'Escape',
  x: 'p', // hold to pass, like on the keyboard
  y: 'v',
  lt: 'l',
  rt: 'l',
  back: 'h',
  start: 'h',
};

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Front-most open dialog (the last in the DOM), ignoring the ones that are closing. */
function topDialog(): HTMLElement | null {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  for (let i = dialogs.length - 1; i >= 0; i--) {
    const dialog = dialogs[i]!;
    if (!dialog.closest('[aria-hidden="true"], [inert]')) return dialog;
  }
  return null;
}

function focusables(scope: ParentNode): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.closest('[aria-hidden="true"], [inert]')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function focus(el: HTMLElement) {
  // focusVisible: shows the focus outline even without a keyboard
  el.focus({ focusVisible: true } as FocusOptions);
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function sendKey(type: 'keydown' | 'keyup', key: string, repeat = false) {
  const target =
    document.activeElement instanceof HTMLElement ? document.activeElement : document.body;
  target.dispatchEvent(new KeyboardEvent(type, { key, repeat, bubbles: true, cancelable: true }));
}

/** Directional focus inside `scope` (menus, dialogs, deck builder). */
function moveFocus(scope: ParentNode, direction: 'up' | 'down' | 'left' | 'right') {
  const candidates = focusables(scope);
  if (candidates.length === 0) return;
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body || !candidates.includes(active)) {
    focus(candidates[0]!);
    return;
  }
  const others = candidates.filter((el) => el !== active);
  const next = nextInDirection(
    active.getBoundingClientRect(),
    others.map((el) => el.getBoundingClientRect()),
    direction,
  );
  if (next >= 0) focus(others[next]!);
}

/** Wires the controller to the interface while the page is open. */
export function useGamepad() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('getGamepads' in navigator)) return;
    const tracker = new PadTracker();
    let frame = 0;

    const handle = (control: PadControl, type: 'press' | 'release' | 'repeat') => {
      const dialog = topDialog();
      const keyMode = dialog ? dialog.hasAttribute('data-carousel') : keyModeScreens > 0;

      if (keyMode) {
        const key = KEYS[control];
        if (!key) return;
        if (type === 'release') {
          if (control === 'x') sendKey('keyup', key);
          return;
        }
        // A on a focused button inside the dialog (e.g. "Finish redraw"): click it
        if (control === 'a' && type === 'press' && dialog) {
          const active = document.activeElement;
          if (
            active instanceof HTMLElement &&
            active !== document.body &&
            dialog.contains(active)
          ) {
            active.click();
            return;
          }
        }
        sendKey('keydown', key, type === 'repeat');
        return;
      }

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
          if (type !== 'press') break;
          const active = document.activeElement;
          if (active instanceof HTMLElement && active !== document.body && scope.contains(active)) {
            active.click();
          } else {
            const first = focusables(scope)[0];
            if (first) focus(first);
          }
          break;
        }
        case 'b':
          if (type !== 'press') break;
          if (dialog) sendKey('keydown', 'Escape');
          else if (window.location.pathname !== '/') window.history.back();
          break;
      }
    };

    const poll = () => {
      // Only the first connected controller is in command
      const pad = [...navigator.getGamepads()].find((p) => p?.connected);
      const pressed = pad
        ? pressedControls({ buttons: pad.buttons.map((b) => b.pressed), axes: pad.axes })
        : new Set<PadControl>();
      for (const event of tracker.update(pressed, performance.now())) {
        handle(event.control, event.type);
      }
      frame = requestAnimationFrame(poll);
    };

    const start = () => {
      if (!frame) frame = requestAnimationFrame(poll);
    };
    const stop = () => {
      if ([...navigator.getGamepads()].some((p) => p?.connected)) return;
      cancelAnimationFrame(frame);
      frame = 0;
      tracker.reset();
    };

    window.addEventListener('gamepadconnected', start);
    window.addEventListener('gamepaddisconnected', stop);
    // Controller already connected before the page opened (some browsers only announce it after a button press)
    if ([...navigator.getGamepads()].some((p) => p?.connected)) start();
    return () => {
      window.removeEventListener('gamepadconnected', start);
      window.removeEventListener('gamepaddisconnected', stop);
      cancelAnimationFrame(frame);
    };
  }, []);
}
