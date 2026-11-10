import { Languages } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type Language } from '@/shared/i18n';
import { useSettingsStore } from '../store/settings.store';

const LABELS: Record<Language, string> = {
  'pt-BR': 'Português (BR)',
  en: 'English',
  es: 'Español',
};

export function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const id = useId();

  return (
    <div className="flex items-center gap-[0.5cqw]">
      <Languages aria-hidden className="size-[1.4cqw] text-gold" />
      <label htmlFor={id} className="text-[1.1cqw]">
        {t('language')}
      </label>
      <select
        id={id}
        value={i18n.resolvedLanguage}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="rounded border border-gold/40 bg-ink-soft px-[0.5cqw] py-[0.2cqw] text-[1.1cqw] text-parchment"
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>
            {LABELS[lng]}
          </option>
        ))}
      </select>
    </div>
  );
}
