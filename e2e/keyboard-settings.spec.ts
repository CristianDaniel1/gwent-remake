import { expect, test, type Page } from '@playwright/test';

async function reachMyTurn(page: Page) {
  await page.goto('/game?seed=7');
  await page.getByRole('button', { name: 'Terminar troca' }).click();
  const pass = page.getByRole('button', { name: 'Passar', exact: true });
  await expect(pass).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 });
  return pass;
}

const handCount = (page: Page) => page.locator('section[aria-label$="na mão"] button').count();

test('player can play a card using only the keyboard', async ({ page }) => {
  await reachMyTurn(page);
  const before = await handCount(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect
    .poll(
      async () => (await handCount(page)) < before || (await page.getByRole('dialog').count()) > 0,
    )
    .toBe(true);
});

test('passing with the keyboard requires holding P for 1 second', async ({ page }) => {
  const pass = await reachMyTurn(page);
  await page.keyboard.press('p');
  await page.waitForTimeout(1300);
  await expect(pass).toBeEnabled();

  await page.keyboard.down('p');
  await page.waitForTimeout(1200);
  await page.keyboard.up('p');
  await expect(page.getByText('Passou', { exact: true })).toBeVisible();
});

test('H opens the shortcut legend', async ({ page }) => {
  await reachMyTurn(page);
  await page.keyboard.press('h');
  await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeVisible();
  await page.keyboard.press('h');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('sound settings persist after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Configurações' }).click();
  const sound = page.getByRole('checkbox', { name: 'Efeitos sonoros' });
  await expect(sound).toBeChecked();
  await sound.uncheck();
  await page.reload();
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.getByRole('checkbox', { name: 'Efeitos sonoros' })).not.toBeChecked();
  await expect(page.getByRole('slider', { name: 'Volume' })).toBeDisabled();
});
