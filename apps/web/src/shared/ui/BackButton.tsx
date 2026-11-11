import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
}

export const BackButton = ({
  onClick,
  className = 'absolute top-[1cqw] left-[1cqw]',
}: BackButtonProps) => {
  const { t: translate } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold',
        className,
      )}
    >
      <ArrowLeft aria-hidden className="size-[1.2cqw]" />
      {translate('deckBuilder.back')}
    </button>
  );
};
