import { expect, test } from '../fixtures/test';

test.use({ reducedMotion: 'no-preference' });

test.describe('Animations', () => {
  test("shows the opponent's card enlarged before it lands and holds the turn notice until then", async ({
    page,
    match,
  }) => {
    await match.open(1);
    await match.finishRedraw();
    await expect(match.passButton).toBeEnabled();
    await match.playFirstCard();

    const opponentCard = page.getByTestId('opponent-card');
    await expect(opponentCard).toBeVisible();
    expect(await match.turnNotice.filter({ hasText: 'Sua vez!' }).count()).toBe(0);

    await expect(opponentCard).toBeHidden();
    await expect(match.turnNotice).toHaveText('Sua vez!');
  });
});
