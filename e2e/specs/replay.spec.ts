import { DEFAULT_SEED, SLOW_TAG } from '../constants/e2e.constants';
import { expect, test } from '../fixtures/test';
import { jsonFile } from '../helpers/files';

test.describe('Replay', () => {
  test(
    'steps, plays, pauses and jumps to the end of a finished match',
    { tag: SLOW_TAG },
    async ({ page, match, replay }) => {
      await match.open(DEFAULT_SEED);
      await match.playWholeMatch();
      await page.getByRole('button', { name: 'Assistir replay' }).click();
      await expect(page).toHaveURL(/\/replay\/local/);
      await expect(replay.moveCounter).toHaveText(/^Jogada 0\//);

      await replay.press('Próxima jogada');
      await expect(replay.moveCounter).toHaveText(/^Jogada 1\//);
      await replay.press('Reproduzir');
      await expect(replay.moveCounter).toHaveText(/^Jogada [2-9]\//);
      await replay.press('Pausar');

      await replay.press('Fim');
      await expect(replay.finalResult).toBeVisible();
      await replay.press('Sair do replay');
      await expect(page.getByRole('heading', { name: 'Gwent' })).toBeVisible();
    },
  );

  test(
    'exports a replay and opens the file from the history',
    { tag: SLOW_TAG },
    async ({ page, match, replay, history }) => {
      await match.open(DEFAULT_SEED);
      await match.playWholeMatch();
      await page.getByRole('button', { name: 'Assistir replay' }).click();
      const downloading = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Exportar replay' }).click();
      const download = await downloading;
      expect(download.suggestedFilename()).toMatch(/\.json$/);

      await history.open();
      await history.openReplayFile(await download.path());
      await expect(page).toHaveURL(/\/replay\/local/);
      await expect(replay.moveCounter).toHaveText(/^Jogada 0\//);
      await replay.press('Fim');
      await expect(replay.finalResult).toBeVisible();
    },
  );

  test('rejects a file that is not a replay', async ({ history }) => {
    await history.open();
    await history.openReplayFile(jsonFile('replay.json', '{"version":1}'));
    await expect(history.fileError).toBeVisible();
  });
});
