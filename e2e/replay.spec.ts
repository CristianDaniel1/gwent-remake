import { expect, test } from '@playwright/test';
import { playWholeMatch } from './helpers';

test('player can watch the replay of a finished match against the bot', async ({ page }) => {
  await page.goto('/game?seed=7');
  await playWholeMatch(page);
  await page.getByRole('button', { name: 'Assistir replay' }).click();

  await expect(page).toHaveURL(/\/replay\/local/);
  const step = page.getByText(/^Jogada \d+\/\d+$/);
  await expect(step).toHaveText(/^Jogada 0\//);

  await page.getByRole('button', { name: 'Próxima jogada' }).click();
  await expect(step).toHaveText(/^Jogada 1\//);
  await page.getByRole('button', { name: 'Reproduzir' }).click();
  await expect(step).toHaveText(/^Jogada [2-9]\//, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Pausar' }).click();

  await page.getByRole('button', { name: 'Fim' }).click();
  await expect(page.getByText(/Vitória de|Empate/)).toBeVisible();

  await page.getByRole('button', { name: 'Sair do replay' }).click();
  await expect(page.getByRole('heading', { name: 'Gwent' })).toBeVisible();
});
