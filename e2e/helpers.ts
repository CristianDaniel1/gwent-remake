import { expect, type Page } from '@playwright/test';

export async function playWholeMatch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const warnings: string[] = [];
  page.on('console', (m) => {
    const offlineApi = process.env.E2E_NO_SERVER && m.location().url.includes('/api/');
    if (m.type() === 'error' && !offlineApi) errors.push(m.text());
    if (m.type() === 'warning') {
      warnings.push(m.text());
      if (process.env.E2E_DEBUG) console.log(`[console ${page.url()}] ${m.text()}`);
    }
  });

  page.setDefaultTimeout(5000);

  const endScreen = page.getByRole('dialog', { name: /Vitória|Derrota|Empate/ });
  const pass = page.getByRole('button', { name: 'Passar', exact: true });
  const hand = page.locator('section[aria-label$="na mão"] button');

  const step = async () => {
    if (await endScreen.count()) {
      await page.waitForTimeout(200);
      return;
    }
    const dialog = page
      .getByRole('dialog')
      .filter({ hasNot: page.getByRole('button', { name: /^(Revanche|Jogar de novo)$/ }) });
    if (await dialog.count()) {
      const finish = dialog.getByRole('button', { name: /Terminar troca|Confirmar/ });
      const pick = dialog.getByRole('button', { name: /^Escolher: / });
      const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
      if ((await finish.count()) && (await finish.isEnabled())) {
        await finish.click();
      } else if (await pick.count()) {
        await pick.click();
        if (await finish.count()) {
          const next = dialog.getByRole('button', { name: 'Próxima carta' });
          if (await next.isEnabled()) await next.click();
          else await dialog.getByRole('button', { name: 'Carta anterior' }).click();
        }
      } else if (await close.count()) {
        await close.click();
      } else {
        await dialog.getByRole('button').first().click();
      }
      return;
    }
    if (!(await pass.isEnabled())) {
      await page.waitForTimeout(200);
      return;
    }
    if (!(await hand.count())) {
      await pass.click();
      return;
    }
    await hand.first().click();
    const play = page.getByRole('button', { name: 'Jogar', exact: true });
    const target = page.locator('[data-target]');
    if (await play.count()) await play.click();
    else if (await target.count()) await target.first().click();
    else await page.keyboard.press('Escape');
  };

  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (await endScreen.isVisible()) break;
    try {
      await step();
    } catch (error) {
      if (!(error instanceof Error && error.name === 'TimeoutError')) throw error;
    }
  }

  if (!(await endScreen.isVisible())) {
    console.log(`[stuck ${page.url()}]\n${await page.locator('body').ariaSnapshot()}`);
  }
  page.setDefaultTimeout(0);
  await expect(endScreen, `console warnings: ${warnings.slice(-5).join(' | ')}`).toBeVisible();
  expect(errors).toEqual([]);
}
