import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-200 shadow-inner">
        <button
          onClick={() => changeLanguage('en')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'en'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'en'}
        >
          EN
        </button>
        <button
          onClick={() => changeLanguage('tr')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'tr'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'tr'}
        >
          TR
        </button>
        <button
          onClick={() => changeLanguage('az')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'az'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'az'}
        >
          AZ
        </button>
        <button
          onClick={() => changeLanguage('es')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'es'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'es'}
        >
          ES
        </button>
        <button
          onClick={() => changeLanguage('pt')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'pt'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'pt'}
        >
          PT
        </button>
        <button
          onClick={() => changeLanguage('uk')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'uk'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'uk'}
        >
          UK
        </button>
        <button
          onClick={() => changeLanguage('ru')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            i18n.language === 'ru'
              ? 'bg-white text-blue-700 shadow border border-blue-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          aria-pressed={i18n.language === 'ru'}
        >
          RU
        </button>
      </div>
    </div>
  );
};

export default LanguageSwitcher; 