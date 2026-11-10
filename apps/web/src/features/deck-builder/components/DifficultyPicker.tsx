import { AI_DIFFICULTIES } from '@gwent/engine';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { cn } from '@/shared/lib/cn';

/** Computer opponent strength (saved in the settings, used from the next match). */
export function DifficultyPicker() {
  const { t } = useTranslation();
  const titleId = useId();
  const difficulty = useSettingsStore((s) => s.botDifficulty);
  const update = useSettingsStore((s) => s.update);

  return (
    <div className="flex flex-col items-center gap-[0.3cqw]">
      <h3 id={titleId} className="text-[0.95cqw] text-gold">
        {t('difficulty.title')}
      </h3>
      <div role="radiogroup" aria-labelledby={titleId} className="flex gap-[0.4cqw]">
        {AI_DIFFICULTIES.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={difficulty === level}
            title={t(`difficulty.hint.${level}`)}
            onClick={() => update({ botDifficulty: level })}
            className={cn(
              'cursor-pointer rounded border px-[0.6cqw] py-[0.15cqw] text-[0.95cqw] transition-colors',
              difficulty === level
                ? 'border-gold bg-gold/20 text-gold-light'
                : 'border-gold/30 text-parchment hover:border-gold/70',
            )}
          >
            {t(`difficulty.${level}`)}
          </button>
        ))}
      </div>
      <p className="max-w-[18cqw] text-[0.8cqw] text-[tan]">{t(`difficulty.hint.${difficulty}`)}</p>
    </div>
  );
}
