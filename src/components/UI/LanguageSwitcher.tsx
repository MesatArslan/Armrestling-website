import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {t('language.en')}:
      </span>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          i18n.language === 'en'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('tr')}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          i18n.language === 'tr'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
      >
        TR
      </button>
    </div>
  );
};

export default LanguageSwitcher; 