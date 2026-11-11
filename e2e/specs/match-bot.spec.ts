import { MATCH_SEEDS, SLOW_TAG } from '../constants/e2e.constants';
import { expect, test } from '../fixtures/test';
import { seedSettings } from '../helpers/storage';

const ALL_MUTATORS = ['fullHands', 'noLeaders', 'inspiration', 'lingeringWeather'];

test.describe('Match against the bot', { tag: SLOW_TAG }, () => {
  for (const seed of MATCH_SEEDS) {
    test(`finishes a whole match (seed ${seed})`, async ({ page, match }) => {
      await match.open(seed);
      await match.playWholeMatch();
      await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible();
    });
  }

  test('starts a new match from the end screen', async ({ page, match }) => {
    await match.open(1);
    await match.playWholeMatch();
    await page.getByRole('button', { name: 'Jogar de novo' }).click();
    await expect(match.endScreen).toBeHidden();
    await expect(match.finishRedrawButton).toBeVisible();
  });

  test('finishes a whole match against the hard bot', async ({ page, match }) => {
    await seedSettings(page, { botDifficulty: 'hard' });
    await match.open(2);
    await match.playWholeMatch();
    await expect(page.getByRole('button', { name: 'Jogar de novo' })).toBeVisible();
  });

  test('shows the rules of a match with every mutator and keeps them in its replay', async ({
    page,
    match,
    replay,
  }) => {
    await seedSettings(page, { mutators: ALL_MUTATORS });
    await match.open(3);
    await expect(match.rules).toHaveCount(ALL_MUTATORS.length);
    await expect(match.hand).toHaveAccessibleName('12 cartas na mão');

    await match.playWholeMatch();
    await page.getByRole('button', { name: 'Assistir replay' }).click();
    await expect(replay.rules).toHaveCount(ALL_MUTATORS.length);
    await replay.press('Fim');
    await expect(replay.finalResult).toBeVisible();
  });
});
