import { SlidersHorizontal } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { DifficultyPicker } from './DifficultyPicker';
import { MutatorPicker } from './MutatorPicker';

const LINK =
  'flex cursor-pointer items-center gap-[0.3cqw] text-[1cqw] text-parchment underline-offset-2 hover:text-gold hover:underline';

/**
 * Summary of the computer difficulty and the match rules, with a dialog to change them
 * (they do not fit in the deck builder column).
 */
export function MatchOptions() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const difficulty = useSettingsStore((s) => s.botDifficulty);
  const mutators = useSettingsStore((s) => s.mutators);

  return (
    <>
      <div className="flex items-center gap-[0.6cqw]">
        <span className="text-[0.9cqw] text-[tan]">
          {t(`difficulty.${difficulty}`)}
          {mutators.length > 0 && ` · ${t('matchOptions.rules', { count: mutators.length })}`}
        </span>
        <button type="button" className={LINK} onClick={() => setOpen(true)}>
          <SlidersHorizontal aria-hidden className="size-[1cqw]" />
          {t('matchOptions.open')}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <Modal
            key="match-options"
            title={t('matchOptions.title')}
            footer={<Button onClick={() => setOpen(false)}>{t('match.close')}</Button>}
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
}
