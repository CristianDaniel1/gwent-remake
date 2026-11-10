import type { ComponentProps } from 'react';
import { cn } from '@/shared/lib/cn';

type ButtonProps = ComponentProps<'button'>;

export function Button({ className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-[0.3cqw] border border-gold/60 bg-ink/85 px-[1.6cqw] py-[0.6cqw] text-[1.3cqw] tracking-wide text-gold-light',
        'transition-colors hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-gold',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
