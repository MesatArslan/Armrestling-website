import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English', flag: 'EN' },
    { code: 'tr', name: 'Türkçe', flag: 'TR' },
    { code: 'az', name: 'Azərbaycan', flag: 'AZ' },
    { code: 'es', name: 'Español', flag: 'ES' },
    { code: 'pt', name: 'Português', flag: 'PT' },
    { code: 'uk', name: 'Українська', flag: 'UK' },
    { code: 'ru', name: 'Русский', flag: 'RU' },
    { code: 'kk', name: 'Қазақша', flag: 'KK' },
    { code: 'ar', name: 'العربية', flag: 'عربي' },
    { code: 'fr', name: 'Français', flag: 'FR' },
    { code: 'de', name: 'Deutsch', flag: 'DE' },
    { code: 'tk', name: 'Türkmençe', flag: 'TK' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main button showing current language */}
      <div className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-200 shadow-inner">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-white text-blue-700 shadow border border-blue-200 transition-colors hover:bg-blue-50"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span>{currentLanguage.flag}</span>
          <ChevronDownIcon 
            className={`w-3 h-3 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 max-h-48 overflow-y-auto">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => changeLanguage(language.code)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-3 ${
                i18n.language === language.code
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="font-semibold text-xs w-8 text-center">
                {language.flag}
              </span>
              <span>{language.name}</span>
              {i18n.language === language.code && (
                <span className="ml-auto text-blue-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher; 