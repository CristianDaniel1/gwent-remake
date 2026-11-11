import { DEFAULT_SEED, SERVER_TAG, SLOW_TAG } from '../constants/e2e.constants';
import { expect, test } from '../fixtures/test';

test.describe('Server profile and history', { tag: SERVER_TAG }, () => {
  test(
    'saves a deck, records a match and opens its replay from the history',
    { tag: SLOW_TAG },
    async ({ page, deckBuilder, match, replay }) => {
      const profileName = `E2E ${Date.now()}`;

      await test.step('create a profile and save the deck on the server', async () => {
        await deckBuilder.open();
        await deckBuilder.createServerProfile(profileName);
        await expect(page.getByText(`Perfil: ${profileName}`)).toBeVisible();
        await deckBuilder.saveCurrentDeckOnServer();
        await expect(page.getByText('Baralho salvo no servidor')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Carregar' })).toHaveCount(1);
        await page.getByRole('button', { name: 'Fechar' }).click();
      });

      await test.step('play a match that goes to the history', async () => {
        await match.open(DEFAULT_SEED);
        await match.playWholeMatch();
        await expect(page.getByText('Partida salva no histórico')).toBeVisible();
      });

      await test.step('find the match in the history', async () => {
        await page.getByRole('button', { name: 'Menu principal' }).click();
        await page.getByRole('button', { name: 'Histórico' }).click();
        await expect(page.getByText(`Perfil: ${profileName}`)).toBeVisible();
        await expect(page.getByRole('row')).toHaveCount(2);
        await expect(page.getByText(/^(Vitória|Derrota|Empate)$/)).toBeVisible();
      });

      await test.step('watch its replay', async () => {
        await page.getByRole('button', { name: /^Assistir replay de/ }).click();
        await expect(page).toHaveURL(/\/replay\//);
        await expect(replay.moveCounter).toHaveText(/^Jogada 0\//);
        await replay.press('Fim');
        await expect(replay.finalResult).toBeVisible();
      });
    },
  );
});
