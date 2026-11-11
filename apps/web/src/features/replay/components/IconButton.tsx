import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface IconButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}

export const IconButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  primary = false,
}: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'flex shrink-0 cursor-pointer items-center justify-center rounded-full border-[0.1cqw] border-gold/60 text-gold transition-colors hover:bg-gold/20 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent',
      primary ? 'size-[2.4cqw] bg-gold/15' : 'size-[1.9cqw]',
    )}
  >
    <Icon aria-hidden className="size-[55%]" />
  </button>
);
