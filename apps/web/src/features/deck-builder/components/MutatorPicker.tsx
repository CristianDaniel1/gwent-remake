import { allMutatorIds } from '@gwent/engine';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings';
import { cn } from '@/shared/lib/cn';
import { mutatorText } from '@/shared/i18n/mutator-text';

export const MutatorPicker = () => {
  const { t: translate } = useTranslation();
  const titleId = useId();
  const chosen = useSettingsStore((store) => store.mutators);
  const update = useSettingsStore((store) => store.update);
  const toggle = (id: string) =>
    update({
      mutators: chosen.includes(id) ? chosen.filter((mutator) => mutator !== id) : [...chosen, id],
    });

  return (
    <fieldset
      className="flex flex-col items-center gap-[0.3cqw]"
      aria-describedby={`${titleId}-hint`}
    >
      <legend id={titleId} className="text-[0.95cqw] text-gold">
        {translate('mutators.title')}
      </legend>
      <p id={`${titleId}-hint`} className="max-w-[18cqw] text-center text-[0.8cqw] text-[tan]">
        {translate('mutators.hint')}
      </p>
      <div className="flex max-w-[20cqw] flex-wrap justify-center gap-[0.3cqw]">
        {allMutatorIds().map((id) => {
          const text = mutatorText(translate, id);
          const enabled = chosen.includes(id);
          return (
            <label
              key={id}
              title={text.description}
              className={cn(
                'flex cursor-pointer items-center gap-[0.25cqw] rounded border px-[0.45cqw] py-[0.1cqw] text-[0.85cqw] transition-colors',
                enabled
                  ? 'border-gold bg-gold/20 text-gold-light'
                  : 'border-gold/30 text-parchment hover:border-gold/70',
              )}
            >
              <input
                type="checkbox"
                checked={enabled}
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
};
