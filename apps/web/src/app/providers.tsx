import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { domMax, LazyMotion, MotionConfig } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useGamepad } from '@/shared/input/useGamepad';
import { createQueryClient } from './query-client';

type ProvidersProps = { children: ReactNode; queryClient?: QueryClient };

/** Controller (gamepad) support on every screen. */
function GamepadSupport() {
  useGamepad();
  return null;
}

export function Providers({ children, queryClient }: ProvidersProps) {
  // One client per app (or the one a test passes), created once.
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <GamepadSupport />
          {children}
        </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
