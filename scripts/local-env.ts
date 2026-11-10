// Reads the local .env files (root: Docker infrastructure; apps/server: API), so scripts and the
// Playwright config use the configured credentials instead of hardcoded ones.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export const root = resolve(import.meta.dirname, '..');
export const serverDir = resolve(root, 'apps/server');

/** Database used only by the tests (API e2e and Playwright), next to the development one. */
export const TEST_DATABASE = 'gwent_test';

/** Variables of a .env file, or of its .env.example when the .env does not exist yet. */
export function readEnvFile(dir: string): Record<string, string> {
  for (const name of ['.env', '.env.example']) {
    const path = resolve(dir, name);
    if (existsSync(path)) return parseEnv(readFileSync(path, 'utf8')) as Record<string, string>;
  }
  return {};
}

/** DATABASE_URL of the Docker Postgres, built from the root .env (POSTGRES_*). */
export function databaseUrlFromInfra(database?: string): string {
  const env = readEnvFile(root);
  const url = new URL('postgresql://localhost');
  url.username = env.POSTGRES_USER ?? 'gwent';
  url.password = env.POSTGRES_PASSWORD ?? '';
  url.port = env.POSTGRES_PORT ?? '5433';
  url.pathname = `/${database ?? env.POSTGRES_DB ?? 'gwent'}`;
  url.searchParams.set('schema', 'public');
  return url.toString();
}

/** Test database URL: the server DATABASE_URL (env var or apps/server/.env) on gwent_test. */
export function testDatabaseUrl(): string | null {
  const base = process.env.DATABASE_URL ?? readEnvFile(serverDir).DATABASE_URL;
  if (!base) return null;
  const url = new URL(base);
  url.pathname = `/${TEST_DATABASE}`;
  return url.toString();
}
