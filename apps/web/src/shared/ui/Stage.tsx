import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type StageProps = { children: ReactNode; background?: string; className?: string };

/**
 * 16:9 stage that takes as much of the window as possible. It is a size container:
 * inside it, use % for positions and `cqw` for sizes (cards, fonts). That way everything
 * scales together without `transform: scale`, which would break layout animations.
 */
export function Stage({ children, background, className }: StageProps) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      <div
        className={cn(
          'relative aspect-video w-[min(100vw,177.78vh)] bg-cover bg-center',
          className,
        )}
        style={{
          containerType: 'size',
          ...(background ? { backgroundImage: `url(${background})` } : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}
