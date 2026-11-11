import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SpectatorCountProps {
  count: number;
}

export const SpectatorCount = ({ count }: SpectatorCountProps) => {
  const { t: translate } = useTranslation();
  return (
    <span className="flex items-center gap-[0.25cqw] text-[tan]">
      <Eye aria-hidden className="size-[1cqw]" />
      {translate('online.spectators', { count })}
    </span>
  );
};
