import { useId, type ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

export const Toggle = ({ checked, onChange, children }: ToggleProps) => {
  const id = useId();
  return (
    <label htmlFor={id} className="flex items-center gap-[0.6cqw] text-[1.1cqw]">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-[1.1cqw] accent-gold"
      />
      {children}
    </label>
  );
};
