import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reportError } from '@/shared/lib/report-error';
import { Button } from '@/shared/ui/Button';

interface RoomCodePanelProps {
  code: string;
  onCancel: () => void;
}

export const RoomCodePanel = ({ code, onCancel }: RoomCodePanelProps) => {
  const { t: translate } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch (error) {
      reportError('room code: copy', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-[1cqw]">
      <p>{translate('online.shareCode')}</p>
      <p
        aria-label={translate('online.codeLabel')}
        className="font-mono text-[5cqw] tracking-[0.4em] text-gold"
      >
        {code}
      </p>
      <div className="flex gap-[0.8cqw]">
        <Button onClick={() => void copyCode()}>
          {copied ? translate('online.copied') : translate('online.copy')}
        </Button>
        <Button onClick={onCancel}>{translate('online.cancel')}</Button>
      </div>
      <p role="status" className="animate-pulse text-[tan]">
        {translate('online.waiting')}
      </p>
    </div>
  );
};
