import { createBrowserRouter } from 'react-router';
import { ErrorBoundary } from './ErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    ErrorBoundary,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/menu')).MenuPage }),
      },
      {
        path: 'deck-builder',
        lazy: async () => ({
          Component: (await import('@/features/deck-builder')).DeckBuilderPage,
        }),
      },
      {
        path: 'history',
        lazy: async () => ({ Component: (await import('@/features/server')).HistoryPage }),
      },
      {
        path: 'online',
        lazy: async () => ({ Component: (await import('@/features/online')).LobbyPage }),
      },
      {
        path: 'online/watch',
        lazy: async () => ({ Component: (await import('@/features/online')).SpectatePage }),
      },
      {
        path: 'online/game',
        lazy: async () => ({ Component: (await import('@/features/online')).OnlineGamePage }),
      },
      {
        path: 'replay/:id',
        lazy: async () => ({ Component: (await import('@/features/replay')).ReplayPage }),
      },
      {
        path: 'game',
        lazy: async () => ({ Component: (await import('@/features/game')).GamePage }),
      },
    ],
  },
]);
