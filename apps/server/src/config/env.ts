import { z } from 'zod';

/** Environment variables the server needs, with their defaults. */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().startsWith('postgresql://'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Frontend origin allowed by CORS. */
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates the environment for the ConfigModule, so the server does not start with missing or
 * invalid variables.
 *
 * @param config - Raw environment variables.
 * @returns The parsed variables with defaults applied.
 * @throws Error - When a variable is missing or invalid.
 */
export const validateEnv = (config: Record<string, unknown>): Env => {
  const parsed = EnvSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
};
