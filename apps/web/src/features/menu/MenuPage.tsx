import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { SettingsModal } from '@/features/settings';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { Stage } from '@/shared/ui/Stage';

export const MenuPage = () => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Stage background={assets.board()}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1.5cqw] bg-black/60">
        <m.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-serif text-[6cqw] text-gold"
        >
          {translate('title')}
        </m.h1>
        <Button onClick={() => void navigate('/deck-builder')}>
          {translate('menu.playVsBot')}
        </Button>
        <Button onClick={() => void navigate('/online')}>{translate('online.menu')}</Button>
        <Button onClick={() => void navigate('/history')}>{translate('history.menu')}</Button>
        <Button onClick={() => setSettingsOpen(true)}>{translate('menu.settings')}</Button>
      </div>
      <AnimatePresence>
        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </Stage>
  );
};
