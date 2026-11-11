import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Impacts that fail the accessibility tests. */
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

/**
 * Runs axe (WCAG 2 A and AA) on the current page.
 *
 * @param page - Page to check.
 * @returns One line per serious or critical violation; empty when there is none.
 */
export const seriousViolations = async (page: Page): Promise<string[]> => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => `${violation.id}: ${violation.nodes.length} node(s) — ${violation.help}`);
};
