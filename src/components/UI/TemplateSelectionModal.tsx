import React, { useState } from 'react';
import { XMarkIcon, InformationCircleIcon, ScaleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { TOURNAMENT_TEMPLATES, getTemplatesByCategory, type TournamentTemplate } from '../../utils/tournamentTemplates';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: TournamentTemplate, handPreference: 'left' | 'right') => void;
}

const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  isOpen,
  onClose,
  onTemplateSelect,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('15');
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | null>(null);
  const [selectedHandPreference, setSelectedHandPreference] = useState<'left' | 'right' | null>('right');

  const categories = getTemplatesByCategory();
  const filteredTemplates = selectedGender 
    ? TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === selectedCategory && t.genderFilter === selectedGender)
    : TOURNAMENT_TEMPLATES.filter(t => t.ageCategory === selectedCategory);

  const handleTemplateSelect = (template: TournamentTemplate) => {
    if (selectedHandPreference) {
      onTemplateSelect(template, selectedHandPreference);
      onClose();
    }
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case '15': return t('tournaments.yildizlarCategory');
      case '18': return t('tournaments.genclerCategory');
      case '23': return t('tournaments.gencBuyuklerCategory');
      case 'senior': return t('tournaments.buyuklerCategory');
      case 'master': return t('tournaments.masterCategory');
      default: return category;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-white/20 rounded-lg p-1.5 sm:p-2">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white">
                  {t('tournaments.selectTemplate')}
                </h2>
                <p className="text-blue-100 mt-1 text-xs sm:text-sm">
                  {t('tournaments.templateCategories')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedHandPreference('right');
                setSelectedGender(null);
                onClose();
              }}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(95vh-120px)]">
          {/* Sidebar - Categories */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6 overflow-y-auto max-h-80 lg:max-h-none">
            <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-base sm:text-lg flex items-center">
              <ScaleIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
              {t('tournaments.ageCategory')}
            </h3>
            
            <div className="space-y-2">
              {Object.keys(categories).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedGender(null);
                    setSelectedHandPreference('right');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {getCategoryDisplayName(category)}
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
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {t('players.rightHanded')}
                </button>
                <button
                  onClick={() => setSelectedHandPreference('left')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedHandPreference === 'left'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-white hover:shadow-md border border-gray-200'
                  }`}
                >
                  {t('players.leftHanded')}
                </button>
              </div>
            </div>
          </div>

          {/* Main Content - Templates */}
          <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all duration-300 transform ${
                    selectedHandPreference 
                      ? 'bg-white hover:border-blue-400 hover:shadow-xl cursor-pointer hover:scale-105' 
                      : 'bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                  onClick={() => selectedHandPreference && handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between mb-4">
                                      <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-2">
                      <ScaleIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg sm:text-xl">
                      {t(template.nameKey)}
                      {selectedHandPreference && (
                        <span className="text-xs sm:text-sm font-medium text-gray-600 ml-1 sm:ml-2">
                          - {t(`players.${selectedHandPreference}Handed`)}
                        </span>
                      )}
                    </h3>
                  </div>
                  <InformationCircleIcon className="h-6 w-6 text-blue-500" />
                </div>
                
                <p className="text-gray-600 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                  {t(template.descriptionKey)}
                </p>

                  <div className="mb-4 sm:mb-6">
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center">
                      <ScaleIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-blue-600" />
                      {t('tournaments.weightCategories')}:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {template.weightRanges.map((range) => (
                        <span
                          key={range.id}
                          className="inline-block bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg font-medium border border-blue-200"
                        >
                          {range.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 sm:pt-4 border-t border-gray-100 gap-2 sm:gap-0">
                    <div className="flex items-center space-x-2 sm:space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          template.genderFilter === 'male' ? 'bg-blue-500' : 
                          template.genderFilter === 'female' ? 'bg-pink-500' : 'bg-green-500'
                        }`}></span>
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          {template.genderFilter ? t(`players.${template.genderFilter}`) : t('tournaments.allGenders')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${
                          selectedHandPreference === 'left' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}></span>
                        <span className="text-xs sm:text-sm font-medium text-gray-700">
                          {t(`players.${selectedHandPreference}Handed`)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-blue-100 text-blue-700 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto">
                      {template.weightRanges.length} {t('tournaments.weightCategories')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

                          {!selectedHandPreference && filteredTemplates.length > 0 && (
                <div className="text-center py-8">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <InformationCircleIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {t('tournaments.selectHandPreference')}
                  </h3>
                  <p className="text-gray-500">
                    {t('tournaments.selectHandPreferenceDesc')}
                  </p>
                </div>
              )}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <ScaleIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {t('tournaments.noTemplates')}
                  </h3>
                  <p className="text-gray-500">
                    {t('tournaments.noTemplatesForCriteria')}
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectionModal;
