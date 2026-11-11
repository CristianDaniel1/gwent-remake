import { QueryClient } from '@tanstack/react-query';

/**
 * Creates the query client with retries and window-focus refetching turned off.
 *
 * @returns The configured query client.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
