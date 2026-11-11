import { SlidersHorizontal } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { cn } from '@/shared/lib/cn';
import { DifficultyPicker } from './DifficultyPicker';
import { MutatorPicker } from './MutatorPicker';
import { UNDERLINED_LINK } from '../constants/styles';

export const MatchOptions = () => {
  const { t: translate } = useTranslation();
  const [open, setOpen] = useState(false);
  const difficulty = useSettingsStore((store) => store.botDifficulty);
  const mutators = useSettingsStore((store) => store.mutators);

  return (
    <>
      <div className="flex items-center gap-[0.6cqw]">
        <span className="text-[0.9cqw] text-[tan]">
          {translate(`difficulty.${difficulty}`)}
          {!!mutators.length && ` · ${translate('matchOptions.rules', { count: mutators.length })}`}
        </span>
        <button
          type="button"
          className={cn(UNDERLINED_LINK, 'flex items-center gap-[0.3cqw]')}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal aria-hidden className="size-[1cqw]" />
          {translate('matchOptions.open')}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <Modal
            key="match-options"
            title={translate('matchOptions.title')}
            footer={<Button onClick={() => setOpen(false)}>{translate('match.close')}</Button>}
          >
            <div className="flex flex-col items-center gap-[1.4cqw]">
              <DifficultyPicker />
              <MutatorPicker />
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
};
