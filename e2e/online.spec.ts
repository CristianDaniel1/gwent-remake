import { expect, test } from '@playwright/test';
import { playWholeMatch } from './helpers';

test.describe('online (server + database)', () => {
  test.beforeEach(async ({ request }) => {
    const health = await request.get('http://localhost:3000/api/health').catch(() => null);
    test.skip(!health?.ok(), 'Server is down (run docker compose up -d)');
  });

  test('player can create a profile, save the deck, play, find the match in the history and watch it', async ({
    page,
  }) => {
    const name = `E2E ${Date.now()}`;

    await page.goto('/deck-builder');
    await page.getByRole('button', { name: 'Baralhos no servidor' }).click();
    await page.getByLabel('Seu nome').fill(name);
    await page.getByRole('button', { name: 'Criar perfil no servidor' }).click();
    await expect(page.getByText(`Perfil: ${name}`)).toBeVisible();
    await page.getByRole('button', { name: 'Salvar baralho atual' }).click();
    await expect(page.getByText('Baralho salvo no servidor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Carregar' })).toHaveCount(1);
    await page.getByRole('button', { name: 'Fechar' }).click();

    await page.goto('/game?seed=7');
    await playWholeMatch(page);
    await expect(page.getByText('Partida salva no histórico')).toBeVisible();

    await page.getByRole('button', { name: 'Menu principal' }).click();
    await page.getByRole('button', { name: 'Histórico' }).click();
    await expect(page.getByText(`Perfil: ${name}`)).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(2);
    await expect(page.getByText(/^(Vitória|Derrota|Empate)$/)).toBeVisible();

    await page.getByRole('button', { name: /^Assistir replay de/ }).click();
    await expect(page).toHaveURL(/\/replay\//);
    await expect(page.getByText(/^Jogada 0\/\d+$/)).toBeVisible();
    await page.getByRole('button', { name: 'Fim' }).click();
    await expect(page.getByText(/Vitória de|Empate/)).toBeVisible();
  });
});
