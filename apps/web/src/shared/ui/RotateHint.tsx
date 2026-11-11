import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const RotateHint = () => {
  const { t: translate } = useTranslation();
  return (
    <p
      role="note"
      className="pointer-events-none fixed inset-x-0 bottom-[6vh] hidden items-center justify-center gap-2 text-center text-base text-gold-light portrait:flex"
    >
      <Smartphone aria-hidden className="size-5 rotate-90" />
      {translate('rotateHint')}
    </p>
  );
};
