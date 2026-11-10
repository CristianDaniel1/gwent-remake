import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Frontend origin allowed by CORS. */
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

/** Used by the ConfigModule: the server does not start with missing or invalid variables. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
