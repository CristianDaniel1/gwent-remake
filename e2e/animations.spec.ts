import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'no-preference' });

test("the opponent's card shows enlarged before it lands, and the turn notice waits for it", async ({
  page,
}) => {
  await page.goto('/game?seed=1');
  await page.getByRole('button', { name: 'Terminar troca' }).click();

  await expect(page.getByRole('button', { name: 'Passar', exact: true })).toBeEnabled();
  await page.locator('section[aria-label$="na mão"] button').first().click();
  const play = page.getByRole('button', { name: 'Jogar', exact: true });
  if (await play.count()) await play.click();
  else await page.locator('[data-target]').first().click();

  const opponentCard = page.getByTestId('opponent-card');
  await expect(opponentCard).toBeVisible();
  expect(await page.getByRole('status').filter({ hasText: 'Sua vez!' }).count()).toBe(0);

  await expect(opponentCard).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Sua vez!');
});
