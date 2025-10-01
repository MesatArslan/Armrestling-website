import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import trTranslation from './locales/tr.json';
import ruTranslation from './locales/ru.json';
import azTranslation from './locales/az.json';
import esTranslation from './locales/es.json';

const resources = {
  en: { translation: enTranslation },
  tr: { translation: trTranslation },
  ru: { translation: ruTranslation },
  az: { translation: azTranslation },
  es: { translation: esTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    supportedLngs: ['en', 'tr', 'ru', 'az', 'es'],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

export default i18n; 