import { expect, test } from '../fixtures/test';
import { connectGamepad, installFakeGamepad, pressGamepadButton } from '../helpers/gamepad';

test.describe('Controller', () => {
  test.beforeEach(async ({ page }) => {
    await installFakeGamepad(page);
  });

  test('navigates the menu and opens the deck builder', async ({ page }) => {
    await page.goto('/');
    const firstOption = page.getByRole('button', { name: 'Jogar contra o computador' });
    await expect(firstOption).toBeVisible();
    await connectGamepad(page);

    await pressGamepadButton(page, 'down');
    await expect(firstOption).toBeFocused();
    await pressGamepadButton(page, 'a');
    await expect(page).toHaveURL(/deck-builder/);
  });

  test('redraws, views card details and plays a card', async ({ page, match }) => {
    await match.open(1);
    await expect(match.finishRedrawButton).toBeVisible();
    await connectGamepad(page);

    await pressGamepadButton(page, 'down');
    await expect(match.finishRedrawButton).toBeFocused();
    await pressGamepadButton(page, 'a');
    await expect(match.finishRedrawButton).toBeHidden();
    await match.waitForMyTurn();

    await pressGamepadButton(page, 'right');
    await expect(match.cardPreview).toBeVisible();
    await pressGamepadButton(page, 'y');
    const details = page.getByRole('dialog', { name: /cartas na mão/ });
    await expect(details).toBeVisible();
    await pressGamepadButton(page, 'right');
    await pressGamepadButton(page, 'b');
    await expect(details).toBeHidden();

    const before = await match.handSize();
    await pressGamepadButton(page, 'a');
    await expect(match.selectionActions).toBeVisible();
    await pressGamepadButton(page, 'a');
    await expect.poll(() => match.handSize()).toBe(before - 1);
  });
});
