import type { Page } from '@playwright/test';

/** Body of a healthy /api/health answer. */
const HEALTHY = { status: 'ok', database: 'ok' };

/**
 * Tells whether a URL is an API request (and not a source module like /src/shared/api/http.ts).
 *
 * @param url - Requested URL.
 * @returns True for paths under /api/.
 */
export const isApiUrl = (url: URL) => url.pathname.startsWith('/api/');

/**
 * Makes every API request fail at the network level, as if the server were down.
 *
 * @param page - Page that will open the app.
 */
export const mockServerDown = async (page: Page) => {
  await page.route(isApiUrl, (route) => route.abort('connectionrefused'));
};

/**
 * Answers the health check as healthy and the API paths that match a pattern with a server error.
 *
 * @param page - Page that will open the app.
 * @param failingPath - Pattern of the API path that answers 500, e.g. /^\/api\/profiles\/[^/]+\/matches$/.
 */
export const mockServerError = async (page: Page, failingPath: RegExp) => {
  await page.route(
    (url) => url.pathname === '/api/health',
    (route) => route.fulfill({ json: HEALTHY }),
  );
  await page.route(
    (url) => failingPath.test(url.pathname),
    (route) =>
      route.fulfill({
        status: 500,
        json: { statusCode: 500, error: 'INTERNAL_SERVER_ERROR', message: 'Internal error' },
      }),
  );
};
