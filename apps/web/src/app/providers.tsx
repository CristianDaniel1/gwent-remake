import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { domMax, LazyMotion, MotionConfig } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { useGamepad } from '@/shared/input/useGamepad';
import { createQueryClient } from './query-client';

interface ProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export const Providers = ({ children, queryClient }: ProvidersProps) => {
  const [client] = useState(() => queryClient ?? createQueryClient());
  useGamepad();
  return (
    <QueryClientProvider client={client}>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
};
