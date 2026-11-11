import { expect, test } from '@playwright/test';

// The other specs run with reduced motion (see playwright.config.ts). Here the move
// animations are on, to check that they show the move and hold the turn notice.
test.use({ reducedMotion: 'no-preference' });

test("the opponent's card shows enlarged before it lands, and the turn notice waits for it", async ({
  page,
}) => {
  await page.goto('/game?seed=1');
  await page.getByRole('button', { name: 'Terminar troca' }).click();

  // Seed 1: the human starts. Play the first card of the hand.
  await expect(page.getByRole('button', { name: 'Passar', exact: true })).toBeEnabled();
  await page.locator('section[aria-label$="na mão"] button').first().click();
  const play = page.getByRole('button', { name: 'Jogar', exact: true });
  if (await play.count()) await play.click();
  else await page.locator('[data-target]').first().click();

  // The opponent answers: its card is shown enlarged, and meanwhile it is not our turn yet
  const opponentCard = page.getByTestId('opponent-card');
  await expect(opponentCard).toBeVisible();
  // A snapshot, not a retrying assertion: at this very moment the turn notice must not be up
  // (retrying would just wait for it to go away)
  expect(await page.getByRole('status').filter({ hasText: 'Sua vez!' }).count()).toBe(0);

  // The card lands on the board, and only then the turn notice shows
  await expect(opponentCard).toBeHidden();
  await expect(page.getByRole('status')).toHaveText('Sua vez!');
});
