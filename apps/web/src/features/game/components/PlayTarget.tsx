import { cn } from '@/shared/lib/cn';

interface PlayTargetProps {
  label: string;
  focused: boolean;
  onClick: () => void;
  className?: string;
}

export const PlayTarget = ({ label, focused, onClick, className }: PlayTargetProps) => (
  <button
    type="button"
    data-target
    aria-label={label}
    onClick={onClick}
    className={cn(
      'play-target absolute inset-0 cursor-pointer',
      focused && 'play-target-focused',
      className,
    )}
  />
);
