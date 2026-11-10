import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { defaultNS, resources, SUPPORTED_LANGUAGES } from './resources';

export { SUPPORTED_LANGUAGES, type Language } from './resources';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS,
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: { es: ['en'], default: ['pt-BR'] },
    interpolation: { escapeValue: false },
    // Only on the first visit: afterwards the language saved in the settings wins (features/settings).
    detection: { order: ['navigator'], caches: [] },
  });

export default i18n;
