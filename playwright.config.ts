import { execSync } from 'node:child_process';
import { defineConfig, devices } from '@playwright/test';
import { testDatabaseUrl } from './scripts/local-env';

const WEB_PORT = 5180;
const API_PORT = 3000;
/** Test-only database (the same one the API e2e tests use), from apps/server/.env. */
const TEST_DATABASE_URL = testDatabaseUrl();

/** Is the docker-compose Postgres up? Without it, the suite runs without the server. */
function postgresUp(): boolean {
  try {
    return (
      execSync('docker inspect -f "{{.State.Health.Status}}" gwent-postgres', {
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim() === 'healthy'
    );
  } catch {
    return false;
  }
}

const withServer = TEST_DATABASE_URL !== null && postgresUp();
// Read by e2e/helpers/page-errors.ts (the config also loads in each worker): without the server, the app's
// requests to /api fail on purpose, and those console errors are expected.
if (!withServer) process.env.E2E_NO_SERVER = '1';

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 180_000,
  // Heavy parallel suite (up to 6 browsers + Vite + Nest): pages take longer to load
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Without the API and the database, the tests tagged @server cannot run
  ...(withServer ? {} : { grepInvert: /@server/ }),
  // list in the terminal; html report (pnpm e2e:report) and traces of failures in test-results/
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: 'pt-BR',
    // Reduced motion: the app skips the pauses that only show a move, so whole matches stay fast.
    // e2e/specs/animations.spec.ts turns them back on to check them.
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1600, height: 900 } },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @gwent/web dev --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    ...(withServer
      ? [
          {
            // Test database first (gwent_test + migrations), then build and start the API
            command:
              'pnpm exec tsx scripts/prepare-test-db.ts && pnpm --filter @gwent/server build && node apps/server/dist/main.js',
            url: `http://localhost:${API_PORT}/api/health`,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
            // Server warnings (e.g. rejected move) show up in the Playwright output
            stdout: 'pipe' as const,
            env: {
              DATABASE_URL: TEST_DATABASE_URL ?? '',
              PORT: String(API_PORT),
              WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
            },
          },
        ]
      : []),
  ],
});
