import { useRef, type ChangeEvent } from 'react';
import { reportError } from '@/shared/lib/report-error';

interface FileButtonProps {
  label: string;
  onText: (text: string) => void;
  onError?: () => void;
  className?: string;
}

export const FileButton = ({ label, onText, onError, className }: FileButtonProps) => {
  const input = useRef<HTMLInputElement>(null);

  const readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      onText(await file.text());
    } catch (error) {
      reportError('file button: read file', error);
      onError?.();
    }
  };

  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        aria-label={label}
        className="hidden"
        onChange={(event) => void readFile(event)}
      />
    </>
  );
};
