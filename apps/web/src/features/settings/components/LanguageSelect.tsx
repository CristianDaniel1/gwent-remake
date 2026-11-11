import { Languages } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type Language } from '@/shared/i18n';
import { useSettingsStore } from '../store/settings.store';
import { LANGUAGE_LABELS } from '../data/languages';

export const LanguageSelect = () => {
  const { t: translate, i18n } = useTranslation();
  const setLanguage = useSettingsStore((store) => store.setLanguage);
  const id = useId();

  return (
    <div className="flex items-center gap-[0.5cqw]">
      <Languages aria-hidden className="size-[1.4cqw] text-gold" />
      <label htmlFor={id} className="text-[1.1cqw]">
        {translate('language')}
      </label>
      <select
        id={id}
        value={i18n.resolvedLanguage}
        onChange={(event) => setLanguage(event.target.value as Language)}
        className="rounded border border-gold/40 bg-ink-soft px-[0.5cqw] py-[0.2cqw] text-[1.1cqw] text-parchment"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {LANGUAGE_LABELS[language]}
          </option>
        ))}
      </select>
    </div>
  );
};
