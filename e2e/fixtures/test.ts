import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { trackPageErrors } from '../helpers/page-errors';
import { DeckBuilderPage } from '../pages/deck-builder.page';
import { HistoryPage } from '../pages/history.page';
import { LobbyPage } from '../pages/lobby.page';
import { MatchPage } from '../pages/match.page';
import { ReplayPage } from '../pages/replay.page';

/** A player with a browser of their own, for multiplayer tests. */
export interface Player {
  /** Name shown to the others, unique in the run (rooms of other tests share the server). */
  name: string;
  page: Page;
  lobby: LobbyPage;
  match: MatchPage;
}

interface Fixtures {
  /** Pattern of the console errors a test expects (e.g. a mocked server failure); any other fails it. */
  allowedConsoleErrors: RegExp | null;
  /** Fails the test when the page threw or logged an unexpected console error. */
  failOnPageErrors: void;
  /** Opens another browser in the online lobby, closed after the test. */
  openPlayer: (name: string) => Promise<Player>;
  match: MatchPage;
  deckBuilder: DeckBuilderPage;
  history: HistoryPage;
  replay: ReplayPage;
}

export const test = base.extend<Fixtures>({
  allowedConsoleErrors: [null, { option: true }],

  failOnPageErrors: [
    async ({ page, allowedConsoleErrors }, use) => {
      const errors = trackPageErrors(page, allowedConsoleErrors);
      await use();
      expect(errors, 'page errors').toEqual([]);
    },
    { auto: true },
  ],

  openPlayer: async ({ browser, allowedConsoleErrors }, use, testInfo) => {
    const contexts: BrowserContext[] = [];
    const errors: string[] = [];
    await use(async (baseName) => {
      const name = `${baseName} ${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      const pageErrors = trackPageErrors(page, allowedConsoleErrors);
      page.on('close', () => errors.push(...pageErrors));
      const lobby = new LobbyPage(page);
      await lobby.open(name);
      return { name, page, lobby, match: new MatchPage(page) };
    });
    for (const context of contexts) await context.close();
    expect(errors, 'page errors of the other players').toEqual([]);
  },

  match: async ({ page }, use) => {
    await use(new MatchPage(page));
  },

  deckBuilder: async ({ page }, use) => {
    await use(new DeckBuilderPage(page));
  },

  history: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },

  replay: async ({ page }, use) => {
    await use(new ReplayPage(page));
  },
});

export { expect };
