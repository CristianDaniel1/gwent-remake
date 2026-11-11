import { expect, test } from '../fixtures/test';
import { jsonFile } from '../helpers/files';

const INVALID_DECK_FILES = [
  { case: 'is not JSON', content: 'not json', message: 'O baralho enviado não pôde ser lido!' },
  {
    case: 'is JSON but not a deck',
    content: '{"hello":"world"}',
    message: 'O baralho enviado não está formatado corretamente!',
  },
];

test.describe('Deck builder', () => {
  test.beforeEach(async ({ deckBuilder }) => {
    await deckBuilder.open();
  });

  test('keeps the edited deck and faction after a reload', async ({ page, deckBuilder }) => {
    await deckBuilder.changeFaction("Scoia'tael");
    const before = await deckBuilder.totalCardCount();
    await deckBuilder.addFirstCollectionCard();
    await expect(deckBuilder.totalCards).toHaveText(String(before + 1));

    await page.reload();
    await expect(page.getByRole('heading', { name: "Scoia'tael" })).toBeVisible();
    await expect(deckBuilder.totalCards).toHaveText(String(before + 1));
  });

  test('downloads the deck and imports the file back', async ({ page, deckBuilder }) => {
    await deckBuilder.changeFaction("Scoia'tael");
    const download = await deckBuilder.downloadDeck();
    expect(download.suggestedFilename()).toBe('gwent-scoiatael.json');

    await deckBuilder.changeFaction('Monstros');
    await expect(page.getByRole('heading', { name: 'Monstros' })).toBeVisible();
    await deckBuilder.uploadDeck(await download.path());
    await expect(deckBuilder.fileMessage).toHaveText('Baralho importado');
    await expect(page.getByRole('heading', { name: "Scoia'tael" })).toBeVisible();
  });

  for (const invalid of INVALID_DECK_FILES) {
    test(`rejects a deck file that ${invalid.case}`, async ({ page, deckBuilder }) => {
      await deckBuilder.uploadDeck(jsonFile('deck.json', invalid.content));
      await expect(deckBuilder.fileMessage).toHaveText(invalid.message);
      await expect(page.getByRole('heading', { name: 'Reinos do Norte' })).toBeVisible();
    });
  }

  test('applies the difficulty and the mutators chosen in the match options', async ({
    page,
    deckBuilder,
    match,
  }) => {
    await deckBuilder.chooseMatchOptions('Difícil', ['Mãos cheias']);
    await expect(deckBuilder.matchOptionsSummary).toHaveText('Difícil · 1 mutador');

    await page.reload();
    await expect(deckBuilder.matchOptionsSummary).toHaveText('Difícil · 1 mutador');
    await deckBuilder.startGameButton.click();
    await expect(match.rules).toHaveText([/^Mãos cheias/]);
    await expect(match.hand).toHaveAccessibleName('12 cartas na mão');
  });
});
