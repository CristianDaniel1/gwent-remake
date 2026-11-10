import { expect, test, type Browser, type Page } from '@playwright/test';
import { playWholeMatch } from './helpers';

// Two people, two browsers, one match through the server (Socket.IO).
// Skipped when the server is down.

async function openLobby(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1600, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('/online');
  await page.getByLabel('Seu nome').fill(name);
  return page;
}

test.describe('multiplayer', () => {
  test.beforeEach(async ({ request }) => {
    const health = await request.get('http://localhost:3000/api/health').catch(() => null);
    test.skip(!health?.ok(), 'Server is down (run docker compose up -d)');
  });

  test('two players can finish a match in a code room and ask for a rematch', async ({
    browser,
  }) => {
    const host = await openLobby(browser, 'Geralt');
    await host.getByRole('button', { name: 'Criar sala' }).click();
    const code = (await host.getByLabel('Código da sala').innerText()).trim();
    expect(code).toMatch(/^[A-Z0-9]{5}$/);

    const guest = await openLobby(browser, 'Ciri');
    await guest.getByLabel('ou entre na sala de um amigo:').fill(code);
    await guest.getByRole('button', { name: 'Entrar' }).click();

    await expect(host).toHaveURL(/\/online\/game/);
    await expect(guest).toHaveURL(/\/online\/game/);
    // Each one sees the other's name
    await expect(host.getByRole('region', { name: 'Ciri' })).toBeVisible();
    await expect(guest.getByRole('region', { name: 'Geralt' })).toBeVisible();

    // Both play at the same time, each on their own turn
    await Promise.all([playWholeMatch(host), playWholeMatch(guest)]);

    await host.getByRole('button', { name: 'Revanche' }).click();
    await expect(guest.getByText('Geralt quer revanche!')).toBeVisible();
    await guest.getByRole('button', { name: 'Revanche' }).click();
    // New match: back to the initial redraw
    await expect(host.getByRole('button', { name: 'Terminar troca' })).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Terminar troca' })).toBeVisible();
  });

  test('leaving closes the room and notifies the opponent', async ({ browser }) => {
    const a = await openLobby(browser, 'Yennefer');
    const b = await openLobby(browser, 'Triss');
    await a.getByRole('button', { name: 'Partida rápida' }).click();
    await expect(a.getByText('Procurando um oponente…')).toBeVisible();
    await b.getByRole('button', { name: 'Partida rápida' }).click();
    await expect(a).toHaveURL(/\/online\/game/);
    await expect(b).toHaveURL(/\/online\/game/);

    await b.getByRole('button', { name: 'Sair da partida' }).click();
    await b.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(a.getByRole('dialog', { name: 'O oponente saiu da partida.' })).toBeVisible();
  });

  test('reloading the page returns to the same match', async ({ browser }) => {
    const a = await openLobby(browser, 'Dandelion');
    await a.getByRole('button', { name: 'Criar sala' }).click();
    const code = (await a.getByLabel('Código da sala').innerText()).trim();
    const b = await openLobby(browser, 'Zoltan');
    await b.getByLabel('ou entre na sala de um amigo:').fill(code);
    await b.getByRole('button', { name: 'Entrar' }).click();
    await expect(b).toHaveURL(/\/online\/game/);

    await b.reload();
    await expect(b).toHaveURL(/\/online\/game/);
    await expect(b.getByRole('region', { name: 'Dandelion' })).toBeVisible();
    await expect(b.getByRole('button', { name: 'Terminar troca' })).toBeVisible();
  });

  test('a spectator can watch a live match without seeing any hand', async ({ browser }) => {
    const host = await openLobby(browser, 'Eskel');
    await host.getByRole('button', { name: 'Criar sala' }).click();
    const code = (await host.getByLabel('Código da sala').innerText()).trim();
    const guest = await openLobby(browser, 'Lambert');
    await guest.getByLabel('ou entre na sala de um amigo:').fill(code);
    await guest.getByRole('button', { name: 'Entrar' }).click();
    await expect(host).toHaveURL(/\/online\/game/);

    // The live list shows the match; watching needs no deck or name
    const watcher = await openLobby(browser, 'Vesemir');
    await watcher.getByRole('button', { name: 'Assistir Eskel × Lambert' }).click();
    await expect(watcher).toHaveURL(/\/online\/watch/);
    await expect(watcher.getByRole('region', { name: 'Eskel' })).toBeVisible();
    await expect(watcher.getByText('Ao vivo')).toBeVisible();
    // Both hands stay face down for the spectator
    await expect(
      watcher.getByRole('region', { name: /cartas na mão/ }).getByRole('button'),
    ).toHaveCount(0);

    // The players know someone is watching, and the spectator follows the moves
    await expect(host.getByText('1 assistindo')).toBeVisible();
    await host.getByRole('button', { name: 'Terminar troca' }).click();
    await guest.getByRole('button', { name: 'Terminar troca' }).click();
    await expect(watcher.getByRole('region', { name: 'Eskel' })).toBeVisible();

    await watcher.getByRole('button', { name: 'Parar de assistir' }).click();
    await expect(watcher).toHaveURL(/\/online$/);
    await expect(host.getByText('1 assistindo')).toBeHidden();
  });
});
