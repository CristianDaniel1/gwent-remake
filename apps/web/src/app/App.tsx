import { RouterProvider } from 'react-router';
import { MusicPlayer } from '@/features/settings';
import { RotateHint } from '@/shared/ui/RotateHint';
import { Providers } from './providers';
import { router } from './router';

export const App = () => (
  <Providers>
    <RouterProvider router={router} />
    <MusicPlayer />
    <RotateHint />
  </Providers>
);
