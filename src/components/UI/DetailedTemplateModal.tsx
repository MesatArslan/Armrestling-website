import React, { useState } from 'react';
import { XMarkIcon, InformationCircleIcon, ScaleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { TOURNAMENT_TEMPLATES, getSchoolTemplatesByCategory, type TournamentTemplate } from '../../utils/tournamentTemplates';

interface DetailedTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: TournamentTemplate) => void;
  onBackToMain: () => void;
}

const DetailedTemplateModal: React.FC<DetailedTemplateModalProps> = ({
  isOpen,
  onClose,
  onTemplateSelect,
  onBackToMain,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('kucukler');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [selectedHandPreference, setSelectedHandPreference] = useState<'left' | 'right' | null>('right');
  const [activeTab, setActiveTab] = useState<'filters' | 'templates'>('filters');

  // Okul şablonları kategorileri
  const schoolCategories = getSchoolTemplatesByCategory();
  const detailedCategories = Object.keys(schoolCategories);

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'kucukler': return t('tournaments.kucuklerCategory');
      case 'yildizlar12': return t('tournaments.yildizlar12Category');
      case 'genclerB': return t('tournaments.genclerBCategory');
      case 'genclerA': return t('tournaments.genclerACategory');
      default: return category;
    }
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'kucukler': return '🟢';
      case 'yildizlar12': return '🟡';
      case 'genclerB': return '🔵';
      case 'genclerA': return '🔴';
      default: return '⚪';
    }
  };

  const filteredTemplates = TOURNAMENT_TEMPLATES.filter(t => {
    const categoryMatch = t.ageCategory === selectedCategory;
    const genderMatch = !selectedGender || t.genderFilter === selectedGender;
    const handMatch = !selectedHandPreference || t.handPreferenceFilter === selectedHandPreference;
    
    return categoryMatch && genderMatch && handMatch;
  });

  const handleTemplateSelect = (template: TournamentTemplate) => {
    onTemplateSelect(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-2">
              <ScaleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {t('tournaments.newDetailedTemplate')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('tournaments.detailedTemplateDescription')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Mobile Tab System */}
        <div className="lg:hidden border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('filters')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'filters'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              } flex-1 px-4 py-3 text-sm font-semibold transition-colors`}
            >
              {t('tournaments.filters') || 'Filtreler'}
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'templates'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              } flex-1 px-4 py-3 text-sm font-semibold transition-colors`}
            >
              {t('tournaments.templates') || 'Şablonlar'}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h:[calc(85vh-120px)] lg:h-[calc(85vh-120px)]">
          {/* Sidebar - Categories */}
          <div className={`w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 overflow-y-auto max-h-[55vh] lg:max-h-none ${activeTab !== 'filters' ? 'hidden lg:block' : ''}`}> 
            {/* Back to Templates Button */}
            <div className="mb-6">
              <button
                onClick={onBackToMain}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <ScaleIcon className="h-4 w-4" />
                <span className="text-sm">{t('tournaments.backToTemplates')}</span>
              </button>
            </div>

            <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-base sm:text-lg flex items-center">
              <ScaleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-purple-600" />
              {t('tournaments.ageCategory')}
            </h3>
            
            <div className="space-y-2">
              {detailedCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedGender(null);
                    setSelectedHandPreference('right');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {getCategoryEmoji(category)} {getCategoryDisplayName(category)}
                </button>
              ))}
            </div>

            <div className="mt-4 sm:mt-6">
              <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-base sm:text-lg">
                {t('tournaments.selectGender')}
              </h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedGender(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedGender === null
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {t('tournaments.showAll')}
                </button>
                <button
                  onClick={() => setSelectedGender('male')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedGender === 'male'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  <UserGroupIcon className="h-4 w-4 inline mr-2" />
                  {t('players.male')}
                </button>
                <button
                  onClick={() => setSelectedGender('female')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedGender === 'female'
                      ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  <UserGroupIcon className="h-4 w-4 inline mr-2" />
                  {t('players.female')}
                </button>
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <h3 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-base sm:text-lg">
                {t('tournaments.handPreference')}
              </h3>
              
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedHandPreference('right')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedHandPreference === 'right'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {t('players.rightHanded')}
                </button>
                <button
                  onClick={() => setSelectedHandPreference('left')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedHandPreference === 'left'
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {t('players.leftHanded')}
                </button>
              </div>
            </div>

          </div>

          {/* Main Content - Templates */}
          <div className={`flex-1 p-4 sm:p-8 overflow-y-auto bg-gray-50 max-h-[55vh] lg:max-h-none ${activeTab !== 'templates' ? 'hidden lg:block' : ''}`}> 
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 transform bg-white hover:border-purple-400 hover:shadow-xl cursor-pointer hover:scale-105"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg p-2">
                        <ScaleIcon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 text-lg sm:text-xl">
                        {t(template.nameKey)}
                        {template.handPreferenceFilter && (
                          <span className="text-xs sm:text-sm font-medium text-gray-600 ml-1 sm:ml-2">
                            - {t(`players.${template.handPreferenceFilter}Handed`)}
                          </span>
                        )}
                      </h3>
                    </div>
                    <InformationCircleIcon className="h-6 w-6 text-purple-500" />
                  </div>
                  
                  <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                    {t(template.descriptionKey)}
                  </p>

                  <div className="mb-4 sm:mb-6">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center">
                      <ScaleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-purple-600" />
                      {t('tournaments.weightCategories')}:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {template.weightRanges.map((range) => {
                        const displayName = typeof range.name === 'string' ? range.name.replace(/kg\b/gi, 'KG') : range.name;
                        return (
                          <span
                            key={range.id}
                            className="inline-block bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium border border-purple-200"
                          >
                            {displayName}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center space-x-2 text-gray-500">
                      <span>{t('tournaments.genderRestriction')}:</span>
                      <span className="font-medium">
                        {template.genderFilter ? t(`players.${template.genderFilter}`) : t('tournaments.allGenders')}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {template.weightRanges.length} {t('tournaments.weightCategories')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedTemplateModal;
