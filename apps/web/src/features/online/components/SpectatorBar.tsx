import { ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SpectatorCount } from './SpectatorCount';

interface SpectatorBarProps {
  spectators: number;
  otherName: string;
  onSwapSides: () => void;
}

export const SpectatorBar = ({ spectators, otherName, onSwapSides }: SpectatorBarProps) => {
  const { t: translate } = useTranslation();
  const swapLabel = translate('online.viewSide', { name: otherName });
  return (
    <div className="absolute top-[0.6%] left-1/2 z-40 flex -translate-x-1/2 items-center gap-[0.8cqw] rounded border border-gold/50 bg-ink/90 px-[1cqw] py-[0.35cqw] text-[1cqw]">
      <span role="status" className="flex items-center gap-[0.4cqw]">
        <span aria-hidden className="size-[0.6cqw] animate-pulse rounded-full bg-red-500" />
        {translate('online.watching')}
        <SpectatorCount count={spectators} />
      </span>
      <button
        type="button"
        aria-label={swapLabel}
        title={swapLabel}
        onClick={onSwapSides}
        className="cursor-pointer text-gold hover:text-gold-light"
      >
        <ArrowUpDown aria-hidden className="size-[1.2cqw]" />
      </button>
    </div>
  );
};
