import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

interface StageProps {
  children: ReactNode;
  background?: string;
  className?: string;
}

export const Stage = ({ children, background, className }: StageProps) => (
  <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
    <div
      className={cn('relative aspect-video w-[min(100vw,177.78vh)] bg-cover bg-center', className)}
      style={{
        containerType: 'size',
        ...(background ? { backgroundImage: `url(${background})` } : {}),
      }}
    >
      {children}
    </div>
  </div>
);
