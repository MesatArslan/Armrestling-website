import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { XMarkIcon, UserGroupIcon, HashtagIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import type { WeightRange } from '../../storage/schemas';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tournamentData: {
    name: string;
    weightRanges: WeightRange[];
    genderFilter: 'male' | 'female' | null;
    handPreferenceFilter: 'left' | 'right' | null;
    birthYearMin: number | null;
    birthYearMax: number | null;
  }) => void;
  isEditMode?: boolean;
  initialData?: {
    name: string;
    weightRanges: WeightRange[];
    genderFilter: 'male' | 'female' | null;
    handPreferenceFilter: 'left' | 'right' | null;
    birthYearMin: number | null;
    birthYearMax: number | null;
  };
}

const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isEditMode = false,
  initialData
}) => {
  const { t } = useTranslation();

  const [newTournamentName, setNewTournamentName] = useState(initialData?.name || '');
  const [weightRanges, setWeightRanges] = useState<WeightRange[]>(
    initialData?.weightRanges || [{ id: uuidv4(), name: '', min: 0, max: 0 }]
  );
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | null>(
    initialData?.genderFilter || 'male'
  );
  const [handPreferenceFilter, setHandPreferenceFilter] = useState<'left' | 'right' | null>(
    initialData?.handPreferenceFilter || null
  );
  const [birthYearMin, setBirthYearMin] = useState<number | null>(
    initialData?.birthYearMin || null
  );
  const [birthYearMax, setBirthYearMax] = useState<number | null>(
    initialData?.birthYearMax || null
  );

  // Styled dropdown states (match Scoring sorting criteria UI)
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [isHandDropdownOpen, setIsHandDropdownOpen] = useState(false);

  // Mobile tab system state
  const [activeTab, setActiveTab] = useState<'details' | 'weight'>('details');

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isGenderDropdownOpen && !target.closest('.gender-dropdown')) {
        setIsGenderDropdownOpen(false);
      }
      if (isHandDropdownOpen && !target.closest('.hand-dropdown')) {
        setIsHandDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isGenderDropdownOpen, isHandDropdownOpen]);

  // Update form state when initialData changes (for edit mode)
  useEffect(() => {
    if (isEditMode && initialData) {
      setNewTournamentName(initialData.name || '');
      setWeightRanges(initialData.weightRanges || [{ id: uuidv4(), name: '', min: 0, max: 0 }]);
      setGenderFilter(initialData.genderFilter || 'male');
      setHandPreferenceFilter(initialData.handPreferenceFilter || null);
      setBirthYearMin(initialData.birthYearMin || null);
      setBirthYearMax(initialData.birthYearMax || null);
    }
  }, [isEditMode, initialData]);

  const handleAddWeightRange = () => {
    setWeightRanges([...weightRanges, { id: uuidv4(), name: '', min: 0, max: 0 }]);
  };

  const handleRemoveWeightRange = (id: string) => {
    if (weightRanges.length > 1) {
      setWeightRanges(weightRanges.filter(range => range.id !== id));
    }
  };

  const handleWeightRangeChange = (id: string, field: 'name' | 'min' | 'max', value: string | number) => {
    setWeightRanges(weightRanges.map(range =>
      range.id === id
        ? { ...range, [field]: value }
        : range
    ));
  };

  const handleSubmit = () => {
    if (!newTournamentName.trim()) return;

    // Validate weight ranges
    const validRanges = weightRanges.filter(range =>
      range.name.trim() && range.min > 0 && range.max > 0 && range.max > range.min
    );

    if (validRanges.length === 0) return;

    onSubmit({
      name: newTournamentName.trim(),
      weightRanges: validRanges.map(range => ({
        ...range,
        excludedPlayerIds: []
      })),
      genderFilter,
      handPreferenceFilter,
      birthYearMin,
      birthYearMax,
    });
  };

  const handleClose = () => {
    setNewTournamentName('');
    setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
    setGenderFilter('male');
    setHandPreferenceFilter(null);
    setBirthYearMin(null);
    setBirthYearMax(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-[100] overflow-hidden"
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-2 sm:mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 sm:px-8 py-4 sm:py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="bg-white/20 rounded-lg p-1.5 sm:p-2 flex-shrink-0">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-xl font-bold text-white truncate">
                  {isEditMode ? t('tournaments.editTournament') : t('tournaments.createNewTournament')}
                </h2>
                <p className="text-blue-100 mt-1 text-xs sm:text-sm">
                  {isEditMode ? t('tournaments.updateTournamentSettings') : t('tournaments.setupTournament')}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg flex-shrink-0 ml-2"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation - Only visible on mobile */}
        <div className="lg:hidden border-b border-gray-200 bg-white">
          <div className="flex">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('tournaments.details')}
            </button>
            <button
              onClick={() => setActiveTab('weight')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'weight'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('tournaments.weightRanges')} ({weightRanges.length})
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row h-[calc(85vh-120px)] lg:h-[calc(85vh-120px)] gap-3 lg:gap-0">
          {/* Left Column - Tournament Details and Filters */}
          <div className={`w-full lg:w-1/2 border-r-0 lg:border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-3 sm:p-4 lg:p-5 overflow-y-auto flex-shrink-0 lg:flex-shrink max-h-[55vh] lg:h-full lg:max-h-none ${activeTab !== 'details' ? 'hidden lg:block' : ''}`}>
            <div className="space-y-4 sm:space-y-6">
              {/* Tournament Name */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2.5 sm:mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 flex-shrink-0">1</span>
                  <span className="truncate">{t('tournaments.tournamentName')}</span>
                </h3>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t('tournaments.tournamentName')} *
                  </label>
                  <input
                    type="text"
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    placeholder={t('tournaments.tournamentNamePlaceholder')}
                    className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-sm"
                  />
                </div>
              </div>

              {/* Tournament Filters */}
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2.5 sm:mb-3 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 flex-shrink-0">2</span>
                  <span className="truncate">{t('tournaments.filters')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.genderRestriction')}
                    </label>
                    <div className="relative gender-dropdown">
                      <button
                        type="button"
                        onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-800 font-medium cursor-pointer hover:border-indigo-300 transition-all duration-200 flex items-center justify-between text-sm"
                      >
                        <span>{genderFilter === 'female' ? t('players.femaleOnly') : t('players.maleOnly')}</span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isGenderDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isGenderDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-[1000] max-h-48 overflow-y-auto">
                          <div className="p-2">
                            {(['male', 'female'] as Array<'male' | 'female'>).map((val) => (
                              <button
                                key={val}
                                onClick={() => {
                                  setGenderFilter(val);
                                  setIsGenderDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-indigo-50 transition-colors duration-200 flex items-center gap-3 rounded-md ${genderFilter === val ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-700'
                                  }`}
                              >
                                <div className={`w-2 h-2 rounded-full ${genderFilter === val ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                <span className="flex-1 text-sm">{val === 'male' ? t('players.maleOnly') : t('players.femaleOnly')}</span>
                                {genderFilter === val && (
                                  <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.handPreference')}
                    </label>
                    <div className="relative hand-dropdown">
                      <button
                        type="button"
                        onClick={() => setIsHandDropdownOpen(!isHandDropdownOpen)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-800 font-medium cursor-pointer hover:border-indigo-300 transition-all duration-200 flex items-center justify-between text-sm"
                      >
                        <span>
                          {handPreferenceFilter === 'left'
                            ? t('players.leftHandOnly')
                            : handPreferenceFilter === 'right'
                              ? t('players.rightHandOnly')
                              : t('tournaments.allHandPreferences')}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isHandDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isHandDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-[1000] max-h-48 overflow-y-auto">
                          <div className="p-2">
                            {([
                              { id: '', label: t('tournaments.allHandPreferences') },
                              { id: 'left', label: t('players.leftHandOnly') },
                              { id: 'right', label: t('players.rightHandOnly') },
                            ] as Array<{ id: '' | 'left' | 'right'; label: string }>).map((opt) => {
                              const isSelected = (handPreferenceFilter || '') === opt.id;
                              return (
                                <button
                                  key={opt.id || 'all'}
                                  onClick={() => {
                                    setHandPreferenceFilter(opt.id === '' ? null : (opt.id as 'left' | 'right'));
                                    setIsHandDropdownOpen(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-indigo-50 transition-colors duration-200 flex items-center gap-3 rounded-md ${isSelected ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-gray-700'
                                    }`}
                                >
                                  <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                                  <span className="flex-1 text-sm">{opt.label}</span>
                                  {isSelected && (
                                    <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Birth Year Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.minBirthYear')}
                    </label>
                    <input
                      type="number"
                      value={birthYearMin || ''}
                      onChange={(e) => setBirthYearMin(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={t('tournaments.minBirthYearPlaceholder')}
                      min="1900"
                      max="2020"
                      className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.maxBirthYear')}
                    </label>
                    <input
                      type="number"
                      value={birthYearMax || ''}
                      onChange={(e) => setBirthYearMax(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={t('tournaments.maxBirthYearPlaceholder')}
                      min="1900"
                      max="2020"
                      className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Weight Ranges */}
          <div className={`flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto bg-gray-50 min-h-0 max-h-[55vh] lg:h-full ${activeTab !== 'weight' ? 'hidden lg:block' : ''}`}>
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-3 sm:p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 flex-shrink-0">3</span>
                    <span className="truncate">{t('tournaments.weightRanges')} ({weightRanges.length})</span>
                  </h3>
                  <button
                    onClick={handleAddWeightRange}
                    className="px-3 sm:px-4 py-2 rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100 transition-colors flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <span className="text-lg">+</span>
                    {t('tournaments.addRange')}
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4 overflow-y-auto">
                  {weightRanges.map((range, index) => (
                    <div key={range.id} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200/80 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-2.5 py-1 text-xs sm:text-sm shadow-sm"
                          title={`${index + 1}`}
                        >
                          <HashtagIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-90" />
                          <span className="font-semibold">{index + 1}</span>
                        </span>
                        {weightRanges.length > 1 && (
                          <button
                            onClick={() => handleRemoveWeightRange(range.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2 transition-colors touch-manipulation"
                            title={t('tournaments.removeRange')}
                          >
                            <span className="text-lg">×</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                            {t('tournaments.divisionName')}
                          </label>
                          <input
                            type="text"
                            value={range.name}
                            onChange={(e) => handleWeightRangeChange(range.id, 'name', e.target.value)}
                            placeholder={t('tournaments.divisionNamePlaceholder')}
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              {t('tournaments.minWeight')}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={range.min || ''}
                              onChange={(e) => handleWeightRangeChange(range.id, 'min', parseFloat(e.target.value) || 0)}
                              placeholder={t('tournaments.minWeightPlaceholder')}
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                              {t('tournaments.maxWeight')}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={range.max || ''}
                              onChange={(e) => handleWeightRangeChange(range.id, 'max', parseFloat(e.target.value) || 0)}
                              placeholder={t('tournaments.maxWeightPlaceholder')}
                              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-sm"
                            />
                          </div>
                        </div>
                        {range.min > 0 && range.max > 0 && (
                          <div className="text-xs sm:text-sm text-blue-700 bg-blue-50/80 border border-blue-200 px-3 py-2 rounded-lg">
                            {t('tournaments.rangeLabel', { min: range.min.toFixed(1), max: range.max.toFixed(1) })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center p-3 sm:p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!newTournamentName.trim() || weightRanges.filter(r => r.name.trim() && r.min > 0 && r.max > 0).length === 0}
            className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg border-2 border-blue-300 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:border-blue-400 transition-colors font-semibold disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto min-w-[180px] shadow-sm"
          >
            {isEditMode ? t('tournaments.saveChanges') : t('tournaments.createTournament')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
