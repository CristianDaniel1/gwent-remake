import { PASS_HOLD_MS } from '../constants/e2e.constants';
import { expect, test } from '../fixtures/test';

test.describe('Keyboard controls', () => {
  test.beforeEach(async ({ match }) => {
    await match.open();
    await match.finishRedraw();
    await match.waitForMyTurn();
  });

  test('plays a card using only the keyboard', async ({ page, match }) => {
    const before = await match.handSize();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(match.selectionActions).toBeVisible();
    await page.keyboard.press('Enter');
    await expect.poll(() => match.handSize()).toBe(before - 1);
  });

  test('opens and closes the shortcut legend with H', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeVisible();
    await page.keyboard.press('h');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('Keyboard controls with a controlled clock', () => {
  test('passes only after holding P for one second', async ({ page, match }) => {
    await page.clock.install();
    await match.open();
    await match.finishRedraw();
    await match.waitForMyTurn();

    await page.keyboard.press('p');
    await page.clock.runFor(PASS_HOLD_MS * 2);
    await expect(match.passButton).toBeEnabled();

    await page.keyboard.down('p');
    await page.clock.runFor(PASS_HOLD_MS);
    await page.keyboard.up('p');
    await expect(page.getByText('Passou', { exact: true })).toBeVisible();
  });
});
