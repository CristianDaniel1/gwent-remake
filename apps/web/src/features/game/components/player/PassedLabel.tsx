import { m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

interface PassedLabelProps {
  position: 'top' | 'bottom';
}

export const PassedLabel = ({ position }: PassedLabelProps) => {
  const { t: translate } = useTranslation();
  return (
    <m.div
      initial={{ opacity: 0, x: '-0.6cqw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute left-[26%] text-[1.5cqw] font-bold text-gold uppercase [text-shadow:0_0_0.4cqw_black]',
        position === 'top' ? 'top-[102%]' : '-top-[28%]',
      )}
    >
      {translate('match.passed')}
    </m.div>
  );
};
