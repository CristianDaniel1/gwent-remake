import { expect, test } from '../fixtures/test';

/** Languages the player can switch to, and a menu text that proves the switch. */
const LANGUAGES = [
  { option: 'English', playVsBot: 'Play vs computer' },
  { option: 'Español', playVsBot: 'Jugar contra la computadora' },
];

test.describe('Language', () => {
  for (const language of LANGUAGES) {
    test(`switches the interface to ${language.option} and keeps it after a reload`, async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Configurações' }).click();
      await page.getByLabel('Idioma').selectOption({ label: language.option });
      await page.keyboard.press('Escape');

      const playVsBot = page.getByRole('button', { name: language.playVsBot });
      await expect(playVsBot).toBeVisible();
      await page.reload();
      await expect(playVsBot).toBeVisible();
    });
  }
});
