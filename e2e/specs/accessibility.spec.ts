import type { Page } from '@playwright/test';
import { DEFAULT_SEED } from '../constants/e2e.constants';
import { expect, test } from '../fixtures/test';
import { seriousViolations } from '../helpers/accessibility';
import { MatchPage } from '../pages/match.page';

/** A screen to check and how to reach it with its content loaded. */
interface Screen {
  name: string;
  open: (page: Page) => Promise<void>;
}

const SCREENS: Screen[] = [
  {
    name: 'menu',
    open: async (page) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Gwent' })).toBeVisible();
    },
  },
  {
    name: 'deck builder',
    open: async (page) => {
      await page.goto('/deck-builder');
      await expect(page.getByRole('button', { name: 'Iniciar jogo' })).toBeVisible();
    },
  },
  {
    name: 'match',
    open: async (page) => {
      const match = new MatchPage(page);
      await match.open(DEFAULT_SEED);
      await match.finishRedraw();
      await match.waitForMyTurn();
    },
  },
  {
    name: 'exit confirmation',
    open: async (page) => {
      const match = new MatchPage(page);
      await match.open(DEFAULT_SEED);
      await match.finishRedraw();
      await match.openExitDialog();
      await expect(match.exitDialog).toBeVisible();
    },
  },
  {
    name: 'settings dialog',
    open: async (page) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Configurações' }).click();
      await expect(page.getByRole('dialog', { name: 'Configurações' })).toBeVisible();
    },
  },
  {
    name: 'match options dialog',
    open: async (page) => {
      await page.goto('/deck-builder');
      await page.getByRole('button', { name: 'Opções da partida' }).click();
      await expect(page.getByRole('dialog', { name: 'Opções da partida' })).toBeVisible();
    },
  },
  {
    name: 'online lobby',
    open: async (page) => {
      await page.goto('/online');
      await expect(page.getByRole('heading', { name: 'Jogar online' })).toBeVisible();
    },
  },
  {
    name: 'history',
    open: async (page) => {
      await page.goto('/history');
      await expect(page.getByRole('heading', { name: 'Histórico de partidas' })).toBeVisible();
    },
  },
];

test.describe('Accessibility', () => {
  for (const screen of SCREENS) {
    test(`${screen.name} has no serious violations`, async ({ page }) => {
      await screen.open(page);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }
});
