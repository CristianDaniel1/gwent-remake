import type { Page } from '@playwright/test';
import { isApiUrl } from './server-mock';

/**
 * Tells whether a console error comes from the API while the suite runs without the server
 * (the app calls /api on purpose and shows its offline state).
 *
 * @param url - Source of the console message.
 * @returns True when the error is expected.
 */
const isOfflineApiError = (url: string) =>
  !!process.env.E2E_NO_SERVER && URL.canParse(url) && isApiUrl(new URL(url));

/**
 * Collects uncaught exceptions and console errors of a page.
 *
 * @param page - Page to watch.
 * @param allowed - Pattern of the console errors a test expects, or null for none.
 * @returns The list that receives each error, filled while the test runs.
 */
export const trackPageErrors = (page: Page, allowed: RegExp | null = null): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`${page.url()} ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (isOfflineApiError(message.location().url)) return;
    if (allowed?.test(message.text())) return;
    errors.push(`${page.url()} ${message.text()}`);
  });
  return errors;
};
