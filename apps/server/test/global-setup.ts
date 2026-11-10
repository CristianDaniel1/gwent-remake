import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    /** Test database URL, or null when Postgres is not up (e2e tests skipped). */
    testDatabaseUrl: string | null;
  }
}

const serverDir = resolve(import.meta.dirname, '..');
const TEST_DB = 'gwent_test';

/**
 * Prepares a test-only database (gwent_test) on the same Postgres as docker-compose:
 * creates it if needed and applies the migrations. The e2e tests never touch the development database.
 */
export default async function setup(project: TestProject) {
  config({ path: resolve(serverDir, '.env'), quiet: true });
  const base = process.env.DATABASE_URL;
  if (!base) return project.provide('testDatabaseUrl', null);

  const testUrl = new URL(base);
  testUrl.pathname = `/${TEST_DB}`;

  const admin = new Client({ connectionString: base, connectionTimeoutMillis: 3000 });
  try {
    await admin.connect();
    const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE ${TEST_DB}`);
  } catch {
    console.warn('\n⚠ Postgres unavailable: API e2e tests skipped (run `docker compose up -d`).\n');
    return project.provide('testDatabaseUrl', null);
  } finally {
    await admin.end().catch(() => {});
  }

  execSync('npx prisma migrate deploy', {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: 'ignore',
  });
  project.provide('testDatabaseUrl', testUrl.toString());
}
