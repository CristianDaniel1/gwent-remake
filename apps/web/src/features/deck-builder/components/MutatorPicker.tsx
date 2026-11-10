import { allMutatorIds } from '@gwent/engine';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { cn } from '@/shared/lib/cn';
import { mutatorText } from '@/shared/i18n/mutator-text';

/** Extra rules for the next match against the computer (saved in the settings). */
export function MutatorPicker() {
  const { t } = useTranslation();
  const titleId = useId();
  const chosen = useSettingsStore((s) => s.mutators);
  const update = useSettingsStore((s) => s.update);
  const toggle = (id: string) =>
    update({ mutators: chosen.includes(id) ? chosen.filter((m) => m !== id) : [...chosen, id] });

  return (
    <fieldset
      className="flex flex-col items-center gap-[0.3cqw]"
      aria-describedby={`${titleId}-hint`}
    >
      <legend id={titleId} className="text-[0.95cqw] text-gold">
        {t('mutators.title')}
      </legend>
      <p id={`${titleId}-hint`} className="max-w-[18cqw] text-center text-[0.8cqw] text-[tan]">
        {t('mutators.hint')}
      </p>
      <div className="flex max-w-[20cqw] flex-wrap justify-center gap-[0.3cqw]">
        {allMutatorIds().map((id) => {
          const text = mutatorText(t, id);
          const on = chosen.includes(id);
          return (
            <label
              key={id}
              title={text.description}
              className={cn(
                'flex cursor-pointer items-center gap-[0.25cqw] rounded border px-[0.45cqw] py-[0.1cqw] text-[0.85cqw] transition-colors',
                on
                  ? 'border-gold bg-gold/20 text-gold-light'
                  : 'border-gold/30 text-parchment hover:border-gold/70',
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(id)}
                className="accent-[goldenrod]"
              />
              {text.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
