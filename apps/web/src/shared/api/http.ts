import { ApiErrorSchema, type ApiError } from '@gwent/shared';
import type { RequestOptions } from '../interfaces/http';

/** Error of an API request, with the HTTP status (0 for network failures) and the error body. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
    options?: ErrorOptions,
  ) {
    super(body?.message ?? `Erro HTTP ${status}`, options);
    this.name = 'ApiRequestError';
  }
}

const buildRequest = <T>(options: RequestOptions<T>): RequestInit => {
  const request: RequestInit = { method: options.method ?? 'GET' };
  if ('body' in options) {
    request.headers = { 'content-type': 'application/json' };
    request.body = JSON.stringify(options.body);
  }
  if (options.signal) request.signal = options.signal;
  return request;
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const send = async (url: URL, request: RequestInit): Promise<Response> => {
  try {
    return await fetch(url, request);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiRequestError(0, null, { cause: error });
  }
};

/**
 * Calls the API and validates the response.
 *
 * @param path - Path after /api.
 * @param options - Method, body, response schema and abort signal.
 * @returns The parsed response, or undefined without a schema.
 */
export const apiRequest = async <T = void>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> => {
  const url = new URL(`/api${path}`, window.location.origin);
  const response = await send(url, buildRequest(options));

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(await readJson(response));
    throw new ApiRequestError(response.status, parsed.success ? parsed.data : null);
  }
  if (response.status === 204 || !options.schema) return undefined as T;
  return options.schema.parse(await readJson(response));
};
