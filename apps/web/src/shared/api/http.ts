import { ApiErrorSchema, type ApiError } from '@gwent/shared';
import type { z } from 'zod';

/** Error from an API call (HTTP status + standard body, if any). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
  ) {
    super(body?.message ?? `Erro HTTP ${status}`);
    this.name = 'ApiRequestError';
  }
}

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Response schema (the same as the server's): the response is validated before reaching the UI. */
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
}

/** Call to the Nest API (in dev, Vite forwards /api to localhost:3000). */
export async function apiRequest<T = void>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);
  const init: RequestInit = { method: options.method ?? 'GET' };
  if (options.body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }
  if (options.signal) init.signal = options.signal;
  const response = await fetch(url, init);

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(await response.json().catch(() => null));
    throw new ApiRequestError(response.status, parsed.success ? parsed.data : null);
  }
  if (response.status === 204 || !options.schema) return undefined as T;
  return options.schema.parse(await response.json());
}
