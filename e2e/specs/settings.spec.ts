import { expect, test } from '../fixtures/test';

test.describe('Settings', () => {
  test('keeps the sound turned off after a reload', async ({ page }) => {
    const openSettings = () => page.getByRole('button', { name: 'Configurações' }).click();
    const soundEffects = page.getByRole('checkbox', { name: 'Efeitos sonoros' });

    await page.goto('/');
    await openSettings();
    await expect(soundEffects).toBeChecked();
    await soundEffects.uncheck();

    await page.reload();
    await openSettings();
    await expect(soundEffects).not.toBeChecked();
    await expect(page.getByRole('slider', { name: 'Volume' })).toBeDisabled();
  });
});
