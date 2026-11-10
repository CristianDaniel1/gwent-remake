import { expect, test, type Page } from '@playwright/test';

// Fake controller: replaces navigator.getGamepads and lets the test press buttons.
// Standard mapping indices: 0 A, 1 B, 2 X, 3 Y, 12-15 d-pad.
const BUTTON = { a: 0, b: 1, x: 2, y: 3, up: 12, down: 13, left: 14, right: 15 } as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const pad = {
      id: 'Test controller',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    (window as unknown as { __pad: typeof pad }).__pad = pad;
    navigator.getGamepads = () => [pad as unknown as Gamepad, null, null, null];
  });
});

async function connect(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('gamepadconnected')));
}

/** Presses and releases a button (with time for the polling loop to see each state). */
async function press(page: Page, button: keyof typeof BUTTON, holdMs = 150) {
  const set = (pressed: boolean) =>
    page.evaluate(
      ([index, value]) => {
        const pad = (window as unknown as { __pad: { buttons: { pressed: boolean }[] } }).__pad;
        pad.buttons[index as number]!.pressed = value as boolean;
      },
      [BUTTON[button], pressed] as const,
    );
  await set(true);
  await page.waitForTimeout(holdMs);
  await set(false);
  await page.waitForTimeout(150);
}

test('player can redraw, view card details and play a card with a controller', async ({ page }) => {
  await page.goto('/game?seed=1');
  const finish = page.getByRole('button', { name: 'Terminar troca' });
  await expect(finish).toBeVisible();
  await connect(page);

  // Initial redraw: ↓ goes to "Terminar troca" and A confirms
  await press(page, 'down');
  await expect(finish).toBeFocused();
  await press(page, 'a');
  await expect(finish).toBeHidden();

  // Hand: → focuses a card and Y opens the details; B closes them
  await press(page, 'right');
  await press(page, 'y');
  const details = page.getByRole('dialog', { name: /cartas na mão/ });
  await expect(details).toBeVisible();
  await press(page, 'right');
  await press(page, 'b');
  await expect(details).toBeHidden();

  // Move: A selects the focused card, A again plays it on the highlighted target
  const hand = page.locator('section[aria-label$="na mão"]');
  const handSize = async () => Number((await hand.getAttribute('aria-label'))?.match(/\d+/)?.[0]);
  // Wait for the player's turn (the computer may start)
  await expect(page.getByRole('button', { name: 'Passar', exact: true })).toBeEnabled({
    timeout: 20_000,
  });
  const sizeBefore = await handSize();
  await press(page, 'a');
  await press(page, 'a');
  await expect.poll(handSize).toBeLessThan(sizeBefore);
});

test('player can navigate the menu with a controller', async ({ page }) => {
  await page.goto('/');
  const first = page.getByRole('button', { name: 'Jogar contra o computador' });
  await expect(first).toBeVisible();
  await connect(page);
  // On a busy machine a tap may fall between two readings: retry until something has focus
  await expect
    .poll(async () => {
      await press(page, 'down');
      return page.evaluate(() => document.activeElement !== document.body);
    })
    .toBe(true);
  await expect(first).toBeFocused();
  await press(page, 'a');
  await expect(page).toHaveURL(/deck-builder/);
});
