// Ensures the test-only database (gwent_test) exists with the migrations applied.
// Runs right before the Playwright API server starts (see playwright.config.ts): Playwright starts
// the webServer before its globalSetup, so the database has to be ready inside that command.
import { execSync } from 'node:child_process';
import { serverDir, TEST_DATABASE, testDatabaseUrl } from './local-env';

const url = testDatabaseUrl();
if (!url) throw new Error('DATABASE_URL not found (run pnpm db:setup)');

try {
  // Uses the container's own POSTGRES_USER/POSTGRES_DB, so no credentials are needed here
  execSync(
    `docker exec gwent-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE ${TEST_DATABASE}"'`,
    { stdio: 'ignore' },
  );
} catch {
  // Already exists
}

execSync('pnpm exec prisma migrate deploy', {
  cwd: serverDir,
  env: { ...process.env, DATABASE_URL: url },
  stdio: 'inherit',
});
