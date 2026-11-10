import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router';
import { Providers } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';

type RenderWithProvidersOptions = RenderOptions & {
  /** Renders `ui` on a route (for pages that read URL params or navigation state). */
  route?: { path: string; entry: InitialEntry };
};

/** render() with the same providers as the app (+ an in-memory router). */
export function renderWithProviders(
  ui: ReactElement,
  { route, ...options }: RenderWithProvidersOptions = {},
) {
  // Fresh cache per test: nothing leaks from one test to another.
  const queryClient = createQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter {...(route ? { initialEntries: [route.entry] } : {})}>
      <Providers queryClient={queryClient}>
        {route ? (
          <Routes>
            <Route path={route.path} element={children} />
          </Routes>
        ) : (
          children
        )}
      </Providers>
    </MemoryRouter>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
