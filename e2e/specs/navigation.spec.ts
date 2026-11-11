import { expect, test } from '../fixtures/test';

test.describe('Navigation', () => {
  test('goes from the menu to a match through the deck builder and back to the menu', async ({
    page,
    match,
    deckBuilder,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Jogar contra o computador' }).click();
    await expect(page).toHaveURL(/deck-builder/);
    await deckBuilder.startGameButton.click();
    await expect(page).toHaveURL(/\/game/);
    await match.finishRedraw();
    await match.leave();
    await expect(page.getByRole('heading', { name: 'Gwent' })).toBeVisible();
  });

  test('keeps the match going when leaving is cancelled', async ({ page, match }) => {
    await match.open();
    await match.finishRedraw();
    await match.openExitDialog();
    await expect(match.exitDialog).toBeVisible();
    await match.exitDialog.getByRole('button', { name: 'Retomar' }).click();

    await expect(match.exitDialog).toBeHidden();
    await expect(page).toHaveURL(/\/game/);
    await match.waitForMyTurn();
  });
});
