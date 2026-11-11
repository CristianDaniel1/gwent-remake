import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.length} elemento(s) — ${v.help}`);
}

test('menu has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Gwent' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test('deck builder has no serious accessibility violations', async ({ page }) => {
  await page.goto('/deck-builder');
  await expect(page.getByRole('button', { name: 'Iniciar jogo' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test('match has no serious accessibility violations', async ({ page }) => {
  await page.goto('/game?seed=7');
  await page.getByRole('button', { name: 'Terminar troca' }).click();
  await expect(page.getByRole('button', { name: 'Passar', exact: true })).toBeEnabled({
    timeout: 30_000,
  });
  expect(await seriousViolations(page)).toEqual([]);
});
