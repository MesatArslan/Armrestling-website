import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
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
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-2 sm:mx-4 max-h-[95vh] flex flex-col overflow-hidden"
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
                <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                  {isEditMode ? t('tournaments.editTournament') : t('tournaments.createNewTournament')}
                </h2>
                <p className="text-blue-100 mt-1 text-sm sm:text-base">
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
        
        <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
          {/* Left Column - Tournament Details and Filters */}
          <div className="w-full lg:w-1/2 border-r-0 lg:border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100 p-3 sm:p-4 lg:p-6 overflow-y-auto flex-shrink-0 lg:flex-shrink max-h-[40vh] lg:max-h-none">
            <div className="space-y-4 sm:space-y-6">
              {/* Tournament Name */}
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 flex-shrink-0">1</span>
                  <span className="truncate">{t('tournaments.tournamentName')}</span>
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tournaments.tournamentName')} *
                  </label>
                  <input
                    type="text"
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    placeholder={t('tournaments.tournamentNamePlaceholder')}
                    className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-base"
                  />
                </div>
              </div>

              {/* Tournament Filters */}
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 flex-shrink-0">2</span>
                  <span className="truncate">{t('tournaments.filters')}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.genderRestriction')}
                    </label>
                    <select
                      value={genderFilter ?? 'male'}
                      onChange={(e) => setGenderFilter(e.target.value as 'male' | 'female' | null || null)}
                      className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 text-base"
                    >
                      <option value="male">{t('players.maleOnly')}</option>
                      <option value="female">{t('players.femaleOnly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.handPreference')}
                    </label>
                    <select
                      value={handPreferenceFilter || ''}
                      onChange={(e) => setHandPreferenceFilter(e.target.value as 'left' | 'right' | null || null)}
                      className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 text-base"
                    >
                      <option value="">{t('tournaments.allHandPreferences')}</option>
                      <option value="left">{t('players.leftHandOnly')}</option>
                      <option value="right">{t('players.rightHandOnly')}</option>
                    </select>
                  </div>
                </div>
                
                {/* Birth Year Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.minBirthYear')}
                    </label>
                    <input
                      type="number"
                      value={birthYearMin || ''}
                      onChange={(e) => setBirthYearMin(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={t('tournaments.minBirthYearPlaceholder')}
                      min="1900"
                      max="2020"
                      className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('tournaments.maxBirthYear')}
                    </label>
                    <input
                      type="number"
                      value={birthYearMax || ''}
                      onChange={(e) => setBirthYearMax(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={t('tournaments.maxBirthYearPlaceholder')}
                      min="1900"
                      max="2020"
                      className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Weight Ranges */}
          <div className="flex-1 p-3 sm:p-4 lg:p-8 overflow-y-auto bg-gray-50 min-h-0">
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex items-center">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-xs sm:text-sm font-bold mr-2 sm:mr-3 flex-shrink-0">3</span>
                    <span className="truncate">{t('tournaments.weightRanges')} ({weightRanges.length})</span>
                  </h3>
                  <button
                    onClick={handleAddWeightRange}
                    className="bg-blue-600 text-white px-4 py-3 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm sm:text-base w-full sm:w-auto"
                  >
                    <span className="text-lg">+</span>
                    {t('tournaments.addRange')}
                  </button>
                </div>
                
                <div className="space-y-3 sm:space-y-4 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto">
                  {weightRanges.map((range, index) => (
                    <div key={range.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-600">{t('tournaments.range')} #{index + 1}</span>
                        {weightRanges.length > 1 && (
                          <button
                            onClick={() => handleRemoveWeightRange(range.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2 transition-colors touch-manipulation"
                            title="Remove this range"
                          >
                            <span className="text-lg">×</span>
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tournaments.divisionName')}
                          </label>
                          <input
                            type="text"
                            value={range.name}
                            onChange={(e) => handleWeightRangeChange(range.id, 'name', e.target.value)}
                            placeholder={t('tournaments.divisionNamePlaceholder')}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-base"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('tournaments.minWeight')}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={range.min || ''}
                              onChange={(e) => handleWeightRangeChange(range.id, 'min', parseFloat(e.target.value) || 0)}
                              placeholder={t('tournaments.minWeightPlaceholder')}
                              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-base"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('tournaments.maxWeight')}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={range.max || ''}
                              onChange={(e) => handleWeightRangeChange(range.id, 'max', parseFloat(e.target.value) || 0)}
                              placeholder={t('tournaments.maxWeightPlaceholder')}
                              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500 text-base"
                            />
                          </div>
                        </div>
                        {range.min > 0 && range.max > 0 && (
                          <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
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
        <div className="flex items-center justify-center p-4 sm:p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!newTournamentName.trim() || weightRanges.filter(r => r.name.trim() && r.min > 0 && r.max > 0).length === 0}
            className="bg-blue-600 text-white px-8 sm:px-12 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed text-base sm:text-lg w-full sm:w-auto min-w-[200px]"
          >
            {isEditMode ? t('tournaments.saveChanges') : t('tournaments.createTournament')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentModal;
