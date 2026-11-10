import { useRef } from 'react';

type FileButtonProps = {
  label: string;
  onText: (text: string) => void;
  className?: string;
};

/** Button that opens the .json file picker and hands over the content as text. */
export function FileButton({ label, onText, className }: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null);
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
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allows uploading the same file again
          if (file) onText(await file.text());
        }}
      />
    </>
  );
}
