// One-time (and idempotent) setup of the optional server: .env files, Postgres in Docker and migrations.
// Usage: pnpm db:setup   (requires Docker running)
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { databaseUrlFromInfra, readEnvFile, root, serverDir } from './local-env';

const run = (command: string, cwd = root) => execSync(command, { cwd, stdio: 'inherit' });

// 1. Root .env: Docker credentials and ports
const infraEnv = resolve(root, '.env');
if (existsSync(infraEnv)) {
  console.log('✓ .env already exists');
} else {
  copyFileSync(resolve(root, '.env.example'), infraEnv);
  console.log('✓ .env created from .env.example');
}

// 2. apps/server/.env: same template, with a DATABASE_URL matching the root .env
const serverEnv = resolve(serverDir, '.env');
if (existsSync(serverEnv)) {
  console.log('✓ apps/server/.env already exists');
} else {
  const template = readFileSync(resolve(serverDir, '.env.example'), 'utf8');
  writeFileSync(
    serverEnv,
    template.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${databaseUrlFromInfra()}"`),
  );
  console.log('✓ apps/server/.env created (DATABASE_URL from the root .env)');
}

// --wait returns once the healthcheck passes (Postgres accepts connections)
run('docker compose up -d --wait postgres');
console.log(`✓ Postgres is up (localhost:${readEnvFile(root).POSTGRES_PORT ?? '5433'})`);

run('pnpm exec prisma migrate deploy', serverDir);
console.log('✓ Migrations applied. Optional: pnpm --filter @gwent/server db:seed');
