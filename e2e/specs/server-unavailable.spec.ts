import { FAILED_REQUEST_ERRORS } from '../constants/e2e.constants';
import { expect, test } from '../fixtures/test';
import { mockServerDown, mockServerError } from '../helpers/server-mock';
import { seedProfile } from '../helpers/storage';

test.describe('Server unavailable', () => {
  test.use({ allowedConsoleErrors: FAILED_REQUEST_ERRORS });

  test.describe('when the server is down', () => {
    test.beforeEach(async ({ page }) => {
      await mockServerDown(page);
    });

    test('explains in the history that the server is offline', async ({ page, history }) => {
      await history.open();
      await expect(history.title).toBeVisible();
      await expect(page.getByText(/^Servidor offline: seus baralhos ficam salvos/)).toBeVisible();
    });

    test('explains in the online lobby that the server is offline', async ({ page }) => {
      await page.goto('/online');
      await expect(page.getByText(/^O servidor está fora do ar/)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Criar sala' })).toHaveCount(0);
    });

    test('still plays a match against the bot', async ({ deckBuilder, match }) => {
      await deckBuilder.open();
      await deckBuilder.startGameButton.click();
      await match.finishRedraw();
      await match.waitForMyTurn();
      const before = await match.handSize();
      await match.playFirstCard();
      await expect.poll(() => match.handSize()).toBe(before - 1);
    });
  });

  test('shows an error when the history cannot be loaded', async ({ page, history }) => {
    await seedProfile(page, {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ciri',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    await mockServerError(page, /^\/api\/profiles\/[^/]+\/matches$/);
    await history.open();
    await expect(page.getByRole('alert')).toHaveText('Não foi possível falar com o servidor.');
  });
});
