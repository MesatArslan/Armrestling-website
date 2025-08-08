import * as React from 'react';
import { useState} from 'react';
import { ChevronDownIcon, ChevronRightIcon, UserGroupIcon, PencilIcon, TrashIcon, XMarkIcon, PlayIcon, TrophyIcon } from '@heroicons/react/24/outline';
import PlayersTable from './PlayersTable';
import { MatchesStorage } from '../../utils/matchesStorage';
import { useTranslation } from 'react-i18next';


interface WeightRange {
  id: string;
  name: string;
  min: number;
  max: number;
  excludedPlayerIds?: string[];
}

interface ExtendedPlayer {
  id: string;
  name: string;
  surname: string;
  weight: number;
  gender: 'male' | 'female';
  handPreference: 'left' | 'right' | 'both';
  birthday?: string;
  city?: string;
  [key: string]: any;
}

interface Tournament {
  id: string;
  name: string;
  weightRanges: WeightRange[];
  isExpanded: boolean;
  genderFilter?: 'male' | 'female' | null;
  handPreferenceFilter?: 'left' | 'right' | null;
  birthYearMin?: number | null;
  birthYearMax?: number | null;
}

interface TournamentCardProps {
  tournament: Tournament;
  players: ExtendedPlayer[];
  onToggle: (tournamentId: string) => void;
  onEdit: (tournament: Tournament) => void;
  onDelete: (tournamentId: string) => void;
  onSelectWeightRange: (tournamentId: string, weightRangeId: string) => void;
  onStartTournament: (tournamentId: string, weightRangeId: string) => void;
  onExcludePlayer: (tournamentId: string, weightRangeId: string, playerId: string) => void;
  onIncludePlayer: (tournamentId: string, weightRangeId: string, playerId: string) => void;
  getAvailablePlayersCount: (weightRange: WeightRange, tournament?: Tournament) => number;
  selectedWeightRange?: string | null;
  selectedTournament?: string | null;
  className?: string;
  onShowPDFPreview?: (tournament: Tournament, weightRange: WeightRange) => void;
  onShowPDFColumnModal?: (tournament: Tournament, weightRange: WeightRange) => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  players,
  onToggle,
  onEdit,
  onDelete,
  onSelectWeightRange,
  onStartTournament,
  onExcludePlayer,
  onIncludePlayer,
  getAvailablePlayersCount,
  selectedWeightRange,
  selectedTournament,
  className = "",
  onShowPDFColumnModal
}) => {
  const { t } = useTranslation();
  const [] = useState({
    gender: null as 'male' | 'female' | null,
    handPreference: null as 'left' | 'right' | null,
    weightMin: null as number | null,
    weightMax: null as number | null,
  });
  const [isPlayerManagementOpen, setIsPlayerManagementOpen] = useState(false);



  const getFilteredPlayers = (weightRange: WeightRange) => {
    return players.filter(player => {
      // Weight range filter
      const weightMatch = player.weight >= weightRange.min && player.weight <= weightRange.max;
      
      // Tournament filters
      const genderMatch = !tournament.genderFilter || player.gender === tournament.genderFilter;
      const handMatch = !tournament.handPreferenceFilter || 
        player.handPreference === tournament.handPreferenceFilter || 
        player.handPreference === 'both';
      
      // Birth year filters
      let birthYearMatch = true;
      if (tournament.birthYearMin || tournament.birthYearMax) {
        const birthYear = player.birthday ? new Date(player.birthday).getFullYear() : null;
        if (birthYear) {
          if (tournament.birthYearMin && birthYear < tournament.birthYearMin) birthYearMatch = false;
          if (tournament.birthYearMax && birthYear > tournament.birthYearMax) birthYearMatch = false;
        }
      }
      
      // Not excluded
      const notExcluded = !weightRange.excludedPlayerIds?.includes(player.id);
      
      return weightMatch && genderMatch && handMatch && birthYearMatch && notExcluded;
    });
  };

  const getExcludedPlayers = (weightRange: WeightRange) => {
    return players.filter(player => {
      const weightMatch = player.weight >= weightRange.min && player.weight <= weightRange.max;
      const genderMatch = !tournament.genderFilter || player.gender === tournament.genderFilter;
      const handMatch = !tournament.handPreferenceFilter || 
        player.handPreference === tournament.handPreferenceFilter || 
        player.handPreference === 'both';
      
      let birthYearMatch = true;
      if (tournament.birthYearMin || tournament.birthYearMax) {
        const birthYear = player.birthday ? new Date(player.birthday).getFullYear() : null;
        if (birthYear) {
          if (tournament.birthYearMin && birthYear < tournament.birthYearMin) birthYearMatch = false;
          if (tournament.birthYearMax && birthYear > tournament.birthYearMax) birthYearMatch = false;
        }
      }
      
      const isExcluded = weightRange.excludedPlayerIds?.includes(player.id);
      
      return weightMatch && genderMatch && handMatch && birthYearMatch && isExcluded;
    });
  };

  const handleExcludePlayer = (playerId: string) => {
    if (selectedWeightRange) {
      onExcludePlayer(tournament.id, selectedWeightRange, playerId);
    }
  };

  const handleIncludePlayer = (playerId: string) => {
    if (selectedWeightRange) {
      onIncludePlayer(tournament.id, selectedWeightRange, playerId);
    }
  };

  const handleManagePlayers = (weightRangeId: string) => {
    if (isPlayerManagementOpen && selectedWeightRange === weightRangeId) {
      // Eğer aynı weight range zaten açıksa, kapat
      setIsPlayerManagementOpen(false);
      onSelectWeightRange(tournament.id, '');
    } else {
      // Yeni weight range'ı aç
      setIsPlayerManagementOpen(true);
      onSelectWeightRange(tournament.id, weightRangeId);
    }
  };

  const handleClosePlayerManagement = () => {
    setIsPlayerManagementOpen(false);
    onSelectWeightRange(tournament.id, '');
  };




  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50 ${className}`}>
      {/* Tournament Header */}
      <div 
        className="p-4 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-200 rounded-t-2xl"
        onClick={() => onToggle(tournament.id)}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{tournament.name}</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {tournament.weightRanges.length} {tournament.weightRanges.length === 1 ? t('tournamentCard.weightCategory') : t('tournamentCard.weightCategories')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tournament);
            }}
            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 group"
            title={t('tournamentCard.editTournament')}
          >
            <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(t('tournamentCard.confirmDeleteTournament', { name: tournament.name }))) {
                onDelete(tournament.id);
              }
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group"
            title={t('tournamentCard.deleteTournament')}
          >
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
          <div className="text-gray-400 transition-transform duration-200">
            {tournament.isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {tournament.isExpanded && (
        <div className="border-t border-gray-200/50 p-4 sm:p-6 bg-gradient-to-br from-gray-50/50 to-white/50">
          {/* All devices: horizontal scroll list */}
          <div className="-mx-4 px-4">
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
              {tournament.weightRanges.map((weightRange) => (
                <div key={weightRange.id} className="shrink-0 w-72 sm:w-80 lg:w-96 snap-start">
                  <WeightRangeCard
                    weightRange={weightRange}
                    tournament={tournament}
                    onSelectWeightRange={onSelectWeightRange}
                    onStartTournament={onStartTournament}
                    getAvailablePlayersCount={getAvailablePlayersCount}
                    isSelected={selectedWeightRange === weightRange.id && selectedTournament === tournament.id}
                    onManagePlayers={handleManagePlayers}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Player Management Section */}
          {isPlayerManagementOpen && selectedWeightRange && selectedTournament === tournament.id && (
            <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200/50">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {t('tournamentCard.managingPlayersFor', { name: tournament.weightRanges.find(wr => wr.id === selectedWeightRange)?.name })}
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 mt-2">
                      {t('tournamentCard.weightRange')}: {tournament.weightRanges.find(wr => wr.id === selectedWeightRange)?.min} - {tournament.weightRanges.find(wr => wr.id === selectedWeightRange)?.max} kg
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                    <button
                      onClick={() => {
                        const filteredPlayers = getFilteredPlayers(tournament.weightRanges.find(wr => wr.id === selectedWeightRange)!);
                        const dataStr = JSON.stringify(filteredPlayers, null, 2);
                        const blob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `tournament_${tournament.name}_${tournament.weightRanges.find(wr => wr.id === selectedWeightRange)?.name}_players.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg shadow hover:from-purple-500 hover:to-purple-700 transition-all duration-200 text-xs sm:text-sm font-semibold"
                    >
                      {t('tournamentCard.exportJSON')}
                    </button>
                    <button
                      onClick={() => {
                        if (onShowPDFColumnModal) {
                          const weightRange = tournament.weightRanges.find(wr => wr.id === selectedWeightRange);
                          if (weightRange) {
                            onShowPDFColumnModal(tournament, weightRange);
                          }
                        }
                      }}
                      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-xs sm:text-sm font-semibold"
                    >
                      {t('tournamentCard.createPDF')}
                    </button>
                    <button
                      onClick={handleClosePlayerManagement}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
                      title={t('tournamentCard.closePlayerManagement')}
                    >
                      <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </div>
                </div>

                {/* Available Players Table */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">
                    {t('tournamentCard.availablePlayers', { count: getFilteredPlayers(tournament.weightRanges.find(wr => wr.id === selectedWeightRange)!).length })}
                  </h4>
                  <PlayersTable
                    players={getFilteredPlayers(tournament.weightRanges.find(wr => wr.id === selectedWeightRange)!)}
                    onPlayersChange={() => {}} // Read-only for tournaments
                    columns={[
                      { id: 'name', name: 'Name', visible: true },
                      { id: 'surname', name: 'Surname', visible: true },
                      { id: 'weight', name: 'Weight', visible: true },
                      { id: 'gender', name: 'Gender', visible: true },
                      { id: 'handPreference', name: 'Hand Preference', visible: true },
                      { id: 'birthday', name: 'Birthday', visible: true },
                    ]}
                    onColumnsChange={() => {}} // Read-only
                    searchTerm=""
                    onSearchChange={() => {}} // Read-only
                    showAddRow={false}
                    showDeleteColumn={true}
                    onDeletePlayer={handleExcludePlayer}
                    className="bg-white/50 rounded-xl"
                  />
                </div>

                {/* Excluded Players Table */}
                {getExcludedPlayers(tournament.weightRanges.find(wr => wr.id === selectedWeightRange)!).length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {t('tournamentCard.excludedPlayers', { count: getExcludedPlayers(tournament.weightRanges.find(wr => wr.id === selectedWeightRange)!).length })}
                    </h4>
                    <div className="bg-gray-50/50 rounded-xl p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        {t('tournamentCard.excludedPlayersDescription')}
                      </p>
                      <PlayersTable
                        players={getExcludedPlayers(tournament.weightRanges.find(wr => wr.id === selectedWeightRange)!)}
                        onPlayersChange={() => {}} // Read-only for tournaments
                        columns={[
                          { id: 'name', name: 'Name', visible: true },
                          { id: 'surname', name: 'Surname', visible: true },
                          { id: 'weight', name: 'Weight', visible: true },
                          { id: 'gender', name: 'Gender', visible: true },
                          { id: 'handPreference', name: 'Hand Preference', visible: true },
                          { id: 'birthday', name: 'Birthday', visible: true },
                        ]}
                        onColumnsChange={() => {}} // Read-only
                        searchTerm=""
                        onSearchChange={() => {}} // Read-only
                        showAddRow={false}
                        showDeleteColumn={true}
                        onDeletePlayer={handleIncludePlayer}
                        className="opacity-60"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      



    </div>
  );
};

interface WeightRangeCardProps {
  weightRange: WeightRange;
  tournament: Tournament;
  onSelectWeightRange: (tournamentId: string, weightRangeId: string) => void;
  onStartTournament: (tournamentId: string, weightRangeId: string) => void;
  getAvailablePlayersCount: (weightRange: WeightRange, tournament?: Tournament) => number;
  isSelected: boolean;
  onManagePlayers: (weightRangeId: string) => void;
}

const WeightRangeCard: React.FC<WeightRangeCardProps> = ({
  weightRange,
  tournament,
  onStartTournament,
  getAvailablePlayersCount,
  isSelected,
  onManagePlayers
}) => {
  const { t } = useTranslation();
  const availablePlayers = getAvailablePlayersCount(weightRange, tournament);
  
  // Check if there's an existing fixture for this tournament and weight range
  const existingFixture = MatchesStorage.getAllFixtures().find(f => 
    f.tournamentId === tournament.id && f.weightRangeId === weightRange.id
  );
  
  const getFixtureStatus = () => {
    if (!existingFixture) return null;
    
    if (existingFixture.status === 'completed') {
      return { status: 'completed', text: t('tournamentCard.completed'), color: 'green' };
    } else if (existingFixture.status === 'active') {
      return { status: 'active', text: t('tournamentCard.inProgress'), color: 'blue' };
    } else if (existingFixture.status === 'paused') {
      return { status: 'paused', text: t('tournamentCard.paused'), color: 'yellow' };
    }
    return null;
  };
  
  const fixtureStatus = getFixtureStatus();
  
  return (
    <div className={`relative bg-white/80 backdrop-blur-sm rounded-xl p-6 border-2 transition-all duration-300 hover:shadow-lg ${
      isSelected 
        ? 'border-blue-500 shadow-lg bg-blue-50/30' 
        : 'border-gray-200/50 hover:border-blue-300/50'
    }`}>
      {/* Weight Range Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900">{weightRange.name}</h3>
          <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">{availablePlayers}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-full">
            <span className="text-sm font-semibold text-orange-800">
              {weightRange.min} - {weightRange.max} kg
            </span>
          </div>
        </div>
      </div>

      {/* Fixture Status */}
      {fixtureStatus && (
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
            fixtureStatus.color === 'green' 
              ? 'bg-green-100 text-green-800' 
              : fixtureStatus.color === 'blue'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              fixtureStatus.color === 'green' 
                ? 'bg-green-500' 
                : fixtureStatus.color === 'blue'
                ? 'bg-blue-500'
                : 'bg-yellow-500'
            } ${fixtureStatus.status === 'active' ? 'animate-pulse' : ''}`}></div>
            {fixtureStatus.text}
          </div>
        </div>
      )}

      {/* Player Count */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-blue-600">{availablePlayers}</span> {t('tournamentCard.playersAvailable')}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => onManagePlayers(weightRange.id)}
          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
            isSelected
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          {t('tournamentCard.managePlayers', { count: availablePlayers })}
        </button>
        
        {!existingFixture ? (
          <button
            onClick={() => onStartTournament(tournament.id, weightRange.id)}
            disabled={availablePlayers === 0}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              availablePlayers === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
            }`}
          >
            <PlayIcon className="w-5 h-5" />
            {t('tournamentCard.startTournament')}
          </button>
        ) : fixtureStatus?.status === 'completed' ? (
          <button
            onClick={() => {
              // Navigate to matches page to show results with rankings tab
              window.location.href = `/matches?tab=rankings&fixture=${existingFixture?.id}`;
            }}
            className="w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
          >
            <TrophyIcon className="w-5 h-5" />
            {t('tournamentCard.showResults')}
          </button>
        ) : (
          <button
            onClick={() => {
              // Navigate to matches page to continue tournament with active tab
              window.location.href = `/matches?tab=active&fixture=${existingFixture?.id}`;
            }}
            className="w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl"
          >
            <PlayIcon className="w-5 h-5" />
            {t('tournamentCard.continueTournament')}
          </button>
        )}
      </div>

      {/* Status Indicator */}
      {availablePlayers === 0 && (
        <div className="absolute top-4 right-4">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      )}
    </div>
  );
};

export default TournamentCard; 