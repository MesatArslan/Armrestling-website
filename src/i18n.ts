import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import trTranslation from './locales/tr.json';
import ruTranslation from './locales/ru.json';
import azTranslation from './locales/az.json';
import esTranslation from './locales/es.json';
import ptTranslation from './locales/pt.json';
import ukTranslation from './locales/uk.json';
import kkTranslation from './locales/kk.json';
import arTranslation from './locales/ar.json';
import frTranslation from './locales/fr.json';
import deTranslation from './locales/de.json';

const resources = {
  en: { translation: enTranslation },
  tr: { translation: trTranslation },
  ru: { translation: ruTranslation },
  az: { translation: azTranslation },
  es: { translation: esTranslation },
  pt: { translation: ptTranslation },
  uk: { translation: ukTranslation },
  kk: { translation: kkTranslation },
  ar: { translation: arTranslation },
  fr: { translation: frTranslation },
  de: { translation: deTranslation }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: { escapeValue: false },
    supportedLngs: ['en', 'tr', 'ru', 'az', 'es', 'pt', 'uk', 'kk', 'ar', 'fr', 'de'],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    react: { useSuspense: false },
  });

export default i18n; 