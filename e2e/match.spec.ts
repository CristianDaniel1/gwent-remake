import { expect, test } from '@playwright/test';
import { playWholeMatch } from './helpers';

for (const seed of [1, 2, 7]) {
  test(`player can finish a full match against the bot (seed ${seed})`, async ({ page }) => {
    await page.goto(`/game?seed=${seed}`);
    await playWholeMatch(page);
    await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible();
  });
}

test('player can go from the menu to a match through the deck builder and back', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar contra o computador' }).click();
  await expect(page).toHaveURL(/deck-builder/);
  await page.getByRole('button', { name: 'Iniciar jogo' }).click();
  await expect(page).toHaveURL(/\/game/);
  // The initial redraw covers the board: finish it before leaving
  await page.getByRole('button', { name: 'Terminar troca' }).click();
  await page.getByRole('button', { name: 'Sair da partida' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Gwent' })).toBeVisible();
});

test('edited deck and faction persist after a reload', async ({ page }) => {
  await page.goto('/deck-builder');
  await page.getByRole('button', { name: 'Trocar Facção' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Scoia'tael/ })
    .click();
  const total = page.locator('dt', { hasText: 'Total de cartas no baralho' }).locator('+ dd');
  const before = Number(await total.innerText());
  await page
    .getByRole('region', { name: 'Coleção de Cartas' })
    .getByRole('button', { name: /^Adicionar / })
    .first()
    .click();
  await expect(total).toHaveText(String(before + 1));

  await page.reload();
  await expect(page.getByRole('heading', { name: "Scoia'tael" })).toBeVisible();
  await expect(total).toHaveText(String(before + 1));
});

test('player can finish a full match against the hard bot', async ({ page }) => {
  // The hard bot thinks in a Web Worker: this checks the worker loads and answers
  await page.addInitScript(() => {
    localStorage.setItem(
      'gwent:settings',
      JSON.stringify({ state: { botDifficulty: 'hard' }, version: 2 }),
    );
  });
  await page.goto('/game?seed=2');
  await playWholeMatch(page);
  await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible();
});

test('player can finish and replay a match with every mutator on', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'gwent:settings',
      JSON.stringify({
        state: { mutators: ['fullHands', 'noLeaders', 'inspiration', 'lingeringWeather'] },
        version: 2,
      }),
    );
  });
  await page.goto('/game?seed=3');
  const rules = page.getByRole('list', { name: 'Regras desta partida' });
  await expect(rules.getByRole('listitem')).toHaveCount(4);
  await expect(page.getByRole('region', { name: '12 cartas na mão' })).toBeVisible();

  await playWholeMatch(page);
  // The replay rebuilds the same match with the same rules
  await page.getByRole('button', { name: 'Assistir replay' }).click();
  await expect(
    page.getByRole('list', { name: 'Regras desta partida' }).getByRole('listitem'),
  ).toHaveCount(4);
  await page.getByRole('button', { name: 'Fim' }).click();
  await expect(page.getByText(/Vitória de|Empate/)).toBeVisible();
});
