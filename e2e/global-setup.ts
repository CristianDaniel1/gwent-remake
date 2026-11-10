import { execSync } from 'node:child_process';
import { serverDir, TEST_DATABASE, testDatabaseUrl } from '../scripts/local-env';

/**
 * Before the E2E tests with a server: ensures the gwent_test database with the migrations applied.
 * (Only runs when the docker-compose Postgres is up; see playwright.config.ts.)
 */
export default function globalSetup() {
  try {
    // Uses the container's own POSTGRES_USER/POSTGRES_DB, so no credentials are needed here
    execSync(
      `docker exec gwent-postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "CREATE DATABASE ${TEST_DATABASE}"'`,
      { stdio: 'ignore' },
    );
  } catch {
    // Already exists
  }
  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() ?? '' },
    stdio: 'ignore',
  });
}
