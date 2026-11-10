import { QueryClient } from '@tanstack/react-query';

/**
 * Server state (TanStack Query). The game works without the server,
 * so there are no retries or noisy errors when it is down.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
