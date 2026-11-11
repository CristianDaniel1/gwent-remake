import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router';
import { Providers } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';

type RenderWithProvidersOptions = RenderOptions & {
  route?: { path: string; entry: InitialEntry };
};

export const renderWithProviders = (
  ui: ReactElement,
  { route, ...options }: RenderWithProvidersOptions = {},
) => {
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
};
