import type { Page } from '@playwright/test';
import { GAMEPAD_BUTTONS } from '../constants/e2e.constants';

/** Name of a button of the fake controller. */
export type GamepadButton = keyof typeof GAMEPAD_BUTTONS;

/**
 * Waits until the browser has drawn a few frames (the app reads the controller once per frame).
 *
 * @param page - Page with the app.
 * @param count - Frames to wait.
 */
const waitForFrames = (page: Page, count = 3) =>
  page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        const next = (remaining: number) => {
          if (!remaining) return resolve();
          requestAnimationFrame(() => next(remaining - 1));
        };
        next(frames);
      }),
    count,
  );

/**
 * Replaces navigator.getGamepads with one standard controller the test can press.
 *
 * @param page - Page that will open the app.
 */
export const installFakeGamepad = async (page: Page) => {
  await page.addInitScript(() => {
    const gamepad = {
      id: 'Test controller',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    (window as unknown as { fakeGamepad: typeof gamepad }).fakeGamepad = gamepad;
    navigator.getGamepads = () => [gamepad as unknown as Gamepad, null, null, null];
  });
};

/**
 * Tells the app the fake controller was plugged in.
 *
 * @param page - Page with the app.
 */
export const connectGamepad = async (page: Page) => {
  await page.evaluate(() => window.dispatchEvent(new Event('gamepadconnected')));
};

/**
 * Presses and releases a button of the fake controller, giving the app frames to read each state.
 *
 * @param page - Page with the app.
 * @param button - Button to press.
 */
export const pressGamepadButton = async (page: Page, button: GamepadButton) => {
  const setPressed = (pressed: boolean) =>
    page.evaluate(
      ({ index, value }) => {
        const { fakeGamepad } = window as unknown as {
          fakeGamepad: { buttons: { pressed: boolean }[] };
        };
        const target = fakeGamepad.buttons[index];
        if (target) target.pressed = value;
      },
      { index: GAMEPAD_BUTTONS[button], value: pressed },
    );
  await setPressed(true);
  await waitForFrames(page);
  await setPressed(false);
  await waitForFrames(page);
};
