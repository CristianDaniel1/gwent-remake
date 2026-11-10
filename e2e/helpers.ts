import { expect, type Page } from '@playwright/test';

/**
 * Plays a whole match through the UI against the bot, with a fixed seed:
 * answers choices, does the redraw, plays the first hand card on the highlighted row
 * (or confirms "Jogar") and passes when it has no cards left.
 */
export async function playWholeMatch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const warnings: string[] = [];
  page.on('console', (m) => {
    // Without the server (Docker off), the /api requests fail on purpose: not an error of the match
    const offlineApi = process.env.E2E_NO_SERVER && m.location().url.includes('/api/');
    if (m.type() === 'error' && !offlineApi) errors.push(m.text());
    if (m.type() === 'warning') {
      warnings.push(m.text());
      if (process.env.E2E_DEBUG) console.log(`[console ${page.url()}] ${m.text()}`);
    }
  });

  // Short timeout for each action: the element may disappear between the check and the action
  // (closing modal, turn passing to the other player). Without a timeout Playwright waits forever;
  // with it, the action fails and the loop looks at the screen again.
  page.setDefaultTimeout(5000);

  const endScreen = page.getByRole('dialog', { name: /Vitória|Derrota|Empate/ });
  const pass = page.getByRole('button', { name: 'Passar', exact: true });
  const hand = page.locator('section[aria-label$="na mão"] button');

  const step = async () => {
    // The end screen is also a dialog: never click it (its first button is "Revanche").
    // While it fades in it may not count as visible yet, so stop on its mere presence.
    if (await endScreen.count()) {
      await page.waitForTimeout(200);
      return;
    }
    // Any dialog except the end screen (it may appear between this check and a click)
    const dialog = page
      .getByRole('dialog')
      .filter({ hasNot: page.getByRole('button', { name: /^(Revanche|Jogar de novo)$/ }) });
    if (await dialog.count()) {
      const finish = dialog.getByRole('button', { name: /Terminar troca|Confirmar/ });
      // Choice carousel: the center card is labeled "Escolher: <name>"
      const pick = dialog.getByRole('button', { name: /^Escolher: / });
      const close = dialog.getByRole('button', { name: 'Fechar', exact: true });
      if ((await finish.count()) && (await finish.isEnabled())) {
        await finish.click();
      } else if (await pick.count()) {
        await pick.click();
        // Multiple choice (e.g. discard 2): mark this one and move to the next card
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
    // Play targets (row, weather, Decoy card); other cards only open details
    const target = page.locator('[data-target]');
    if (await play.count()) await play.click();
    else if (await target.count()) await target.first().click();
    else await page.keyboard.press('Escape');
  };

  // Deadline in time (not steps): online, half the time is spent waiting for the other player.
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (await endScreen.isVisible()) break;
    try {
      await step();
    } catch (error) {
      // Only action timeouts are expected; anything else (closed page etc.) is rethrown
      if (!(error instanceof Error && error.name === 'TimeoutError')) throw error;
    }
  }

  if (!(await endScreen.isVisible())) {
    // Diagnostics: the trace only records the main page; print what this page is seeing.
    console.log(`[stuck ${page.url()}]\n${await page.locator('body').ariaSnapshot()}`);
  }
  // The short action timeout is only for the loop: give the rest of the test the default back
  page.setDefaultTimeout(0);
  await expect(endScreen, `console warnings: ${warnings.slice(-5).join(' | ')}`).toBeVisible();
  expect(errors).toEqual([]);
}
