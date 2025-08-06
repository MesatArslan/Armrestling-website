import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Player } from '../types';
import TournamentCard from '../components/UI/TournamentCard';
import { TournamentsStorage, type Tournament, type WeightRange, type PlayerFilters} from '../utils/tournamentsStorage';
import { PlayersStorage, type Column } from '../utils/playersStorage';
import { openPreviewModal, generatePDF } from '../utils/pdfGenerator';

// Tournaments sayfası için Player interface'ini genişletiyoruz
interface ExtendedPlayer extends Player {
  [key: string]: any;
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [selectedWeightRange, setSelectedWeightRange] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [weightRanges, setWeightRanges] = useState<WeightRange[]>([
    { id: uuidv4(), name: '', min: 0, max: 0 }
  ]);
  const [playerFilters, setPlayerFilters] = useState<PlayerFilters>({
    gender: null,
    handPreference: null,
    weightMin: null,
    weightMax: null,
  });
  const [, setAppliedFilters] = useState<PlayerFilters>({
    gender: null,
    handPreference: null,
    weightMin: null,
    weightMax: null,
  });
  const [, setShowFilteredPlayers] = useState(false);
  const [isLoadingFromStorage, setIsLoadingFromStorage] = useState(true);
  const [createTournamentGenderFilter, setCreateTournamentGenderFilter] = useState<'male' | 'female' | null>(null);
  const [createTournamentHandPreferenceFilter, setCreateTournamentHandPreferenceFilter] = useState<'left' | 'right' | null>(null);
  const [createTournamentBirthYearMin, setCreateTournamentBirthYearMin] = useState<number | null>(null);
  const [createTournamentBirthYearMax, setCreateTournamentBirthYearMax] = useState<number | null>(null);
  const navigate = useNavigate();

  // PDF Preview Modal States
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(0);
  const [selectedPDFColumns, setSelectedPDFColumns] = useState<string[]>([
    'name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'
  ]);
  const [availablePDFColumns, setAvailablePDFColumns] = useState<Column[]>([]);
  const [playersPerPage, setPlayersPerPage] = useState<number>(33);
  const [currentTournamentForPDF, setCurrentTournamentForPDF] = useState<Tournament | null>(null);
  const [currentWeightRangeForPDF, setCurrentWeightRangeForPDF] = useState<WeightRange | null>(null);
  const [isPDFColumnModalOpen, setIsPDFColumnModalOpen] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isCreateModalOpen || isPDFPreviewModalOpen || isPDFColumnModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreateModalOpen, isPDFPreviewModalOpen, isPDFColumnModalOpen]);

  // Load all data from localStorage
  useEffect(() => {
    setIsLoadingFromStorage(true);
    
    // Load players
    const savedPlayers = localStorage.getItem('arm-wrestling-players');
    if (savedPlayers) {
      try {
        const parsedPlayers = JSON.parse(savedPlayers);
        setPlayers(parsedPlayers);
      } catch (error) {
        // Error loading players from localStorage
      }
    }

    // Load tournaments using utility
    const loadedTournaments = TournamentsStorage.getTournaments();
    setTournaments(loadedTournaments);

    // Load selected tournament and weight range using utility
    const savedSelectedTournament = TournamentsStorage.getSelectedTournament();
    const savedSelectedWeightRange = TournamentsStorage.getSelectedWeightRange();
    
    if (savedSelectedTournament) {
      setSelectedTournament(savedSelectedTournament);
    }
    
    if (savedSelectedWeightRange) {
      setSelectedWeightRange(savedSelectedWeightRange);
    }

    // Load filters using utility
    const loadedFilters = TournamentsStorage.getPlayerFilters();
    setPlayerFilters(loadedFilters);
    setAppliedFilters(loadedFilters);
    setShowFilteredPlayers(true);

    // Mark loading as complete after a short delay to ensure all state is set
    setTimeout(() => setIsLoadingFromStorage(false), 100);
  }, []);

  // Load PDF columns from PlayersStorage
  useEffect(() => {
    const columns = PlayersStorage.getColumns();
    setAvailablePDFColumns(columns);
    // Set default selected columns to visible ones
    const visibleColumnIds = columns.filter(col => col.visible).map(col => col.id);
    setSelectedPDFColumns(visibleColumnIds);
  }, []);

  // Save tournaments to localStorage whenever they change (except during initial load)
  useEffect(() => {
    if (!isLoadingFromStorage) {
      TournamentsStorage.saveTournaments(tournaments);
    }
  }, [tournaments, isLoadingFromStorage]);

  // Save selected tournament to localStorage
  useEffect(() => {
    if (!isLoadingFromStorage) {
      TournamentsStorage.saveSelectedTournament(selectedTournament);
    }
  }, [selectedTournament, isLoadingFromStorage]);

  // Save selected weight range to localStorage
  useEffect(() => {
    if (!isLoadingFromStorage) {
      TournamentsStorage.saveSelectedWeightRange(selectedWeightRange);
    }
  }, [selectedWeightRange, isLoadingFromStorage]);

  // Save filters to localStorage whenever they change (except during initial load)
  useEffect(() => {
    if (!isLoadingFromStorage) {
      TournamentsStorage.savePlayerFilters(playerFilters);
      setAppliedFilters(playerFilters);
      setShowFilteredPlayers(true);
    }
  }, [playerFilters, isLoadingFromStorage]);

  const toggleTournament = (tournamentId: string) => {
    setTournaments(tournaments.map(tournament => 
      tournament.id === tournamentId 
        ? { ...tournament, isExpanded: !tournament.isExpanded }
        : tournament
    ));
  };

  const handleSelectWeightRange = (tournamentId: string, weightRangeId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    const weightRange = tournament?.weightRanges.find(wr => wr.id === weightRangeId);
    
    if (weightRange) {
      setSelectedTournament(tournamentId);
      setSelectedWeightRange(weightRangeId);
      
      // Set weight filter to the weight range and apply it immediately
      const newFilters = {
        gender: null,
        handPreference: null,
        weightMin: weightRange.min,
        weightMax: weightRange.max,
      };
      
      setPlayerFilters(newFilters);
      setAppliedFilters(newFilters);
      setShowFilteredPlayers(true);
    }
  };


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

  // JSON Export

  // JSON Import

  const handleCreateTournament = () => {
    if (!newTournamentName.trim()) return;

    // Validate weight ranges
    const validRanges = weightRanges.filter(range => 
      range.name.trim() && range.min > 0 && range.max > 0 && range.max > range.min
    );

    if (validRanges.length === 0) return;

    const newTournament: Tournament = {
      id: uuidv4(),
      name: newTournamentName.trim(),
      weightRanges: validRanges.map(range => ({
        ...range,
        excludedPlayerIds: []
      })),
      isExpanded: false,
      genderFilter: createTournamentGenderFilter,
      handPreferenceFilter: createTournamentHandPreferenceFilter,
      birthYearMin: createTournamentBirthYearMin,
      birthYearMax: createTournamentBirthYearMax,
    };

    const updatedTournaments = [...tournaments, newTournament];
    setTournaments(updatedTournaments);
    TournamentsStorage.saveTournaments(updatedTournaments);
    setNewTournamentName('');
    setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
    setCreateTournamentGenderFilter(null);
    setCreateTournamentHandPreferenceFilter(null);
    setCreateTournamentBirthYearMin(null);
    setCreateTournamentBirthYearMax(null);
    setIsCreateModalOpen(false);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setIsEditMode(true);
    setEditingTournamentId(tournament.id);
    setNewTournamentName(tournament.name);
    setWeightRanges(tournament.weightRanges);
    setCreateTournamentGenderFilter(tournament.genderFilter || null);
    setCreateTournamentHandPreferenceFilter(tournament.handPreferenceFilter || null);
    setCreateTournamentBirthYearMin(tournament.birthYearMin || null);
    setCreateTournamentBirthYearMax(tournament.birthYearMax || null);
    setPlayerFilters({
      gender: tournament.genderFilter || null,
      handPreference: tournament.handPreferenceFilter || null,
      weightMin: null,
      weightMax: null,
    });
    setAppliedFilters({
      gender: tournament.genderFilter || null,
      handPreference: tournament.handPreferenceFilter || null,
      weightMin: null,
      weightMax: null,
    });
    setShowFilteredPlayers(true);
    setIsCreateModalOpen(true);
  };

  const handleDeleteTournament = (tournamentId: string) => {
    const updatedTournaments = TournamentsStorage.deleteTournament(tournaments, tournamentId);
    setTournaments(updatedTournaments);
  };

  const handleSaveEdit = () => {
    if (!editingTournamentId || !newTournamentName.trim()) return;

    // Validate weight ranges
    const validRanges = weightRanges.filter(range => 
      range.name.trim() && range.min > 0 && range.max > 0 && range.max > range.min
    );

    if (validRanges.length === 0) return;

    const updatedTournament: Tournament = {
      ...tournaments.find(t => t.id === editingTournamentId)!,
      name: newTournamentName.trim(),
      weightRanges: validRanges.map(range => {
        // Find existing weight range to preserve excludedPlayerIds
        const existingRange = tournaments.find(t => t.id === editingTournamentId)!.weightRanges.find(wr => wr.id === range.id);
        return {
          ...range,
          excludedPlayerIds: existingRange?.excludedPlayerIds || []
        };
      }),
      genderFilter: playerFilters.gender,
      handPreferenceFilter: playerFilters.handPreference,
      birthYearMin: createTournamentBirthYearMin,
      birthYearMax: createTournamentBirthYearMax,
    };
    
    const updatedTournaments = TournamentsStorage.updateTournament(tournaments, updatedTournament);
    setTournaments(updatedTournaments);

    // Reset form
    setNewTournamentName('');
    setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
    setPlayerFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
    setAppliedFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
    setIsEditMode(false);
    setEditingTournamentId(null);
    setCreateTournamentGenderFilter(null);
    setCreateTournamentHandPreferenceFilter(null);
    setCreateTournamentBirthYearMin(null);
    setCreateTournamentBirthYearMax(null);
    setIsCreateModalOpen(false);
  };


  const getAvailablePlayersCount = (weightRange: WeightRange, tournament?: Tournament) => {
    return players.filter(player => {
      // Exclude players that are specifically excluded from this weight range
      if (weightRange.excludedPlayerIds?.includes(player.id)) {
        return false;
      }
      
      const matchesWeight = Number(player.weight || 0) >= weightRange.min && Number(player.weight || 0) <= weightRange.max;
      const matchesTournamentGender = !tournament?.genderFilter || player.gender === tournament.genderFilter;
      const matchesTournamentHand = !tournament?.handPreferenceFilter || 
        player.handPreference === tournament.handPreferenceFilter || 
        player.handPreference === 'both';
      
      // Apply birth year filter if tournament has birth year restrictions
      let matchesBirthYear = true;
      if (tournament && (tournament.birthYearMin || tournament.birthYearMax) && player.birthday) {
        const playerBirthYear = new Date(player.birthday).getFullYear();
        matchesBirthYear = 
          (!tournament.birthYearMin || playerBirthYear >= tournament.birthYearMin) &&
          (!tournament.birthYearMax || playerBirthYear <= tournament.birthYearMax);
      }
      
      return matchesWeight && matchesTournamentGender && matchesTournamentHand && matchesBirthYear;
    }).length;
  };

  const handleExcludePlayer = (tournamentId: string, weightRangeId: string, playerId: string) => {
    const updatedTournaments = TournamentsStorage.excludePlayerFromWeightRange(tournaments, tournamentId, weightRangeId, playerId);
    setTournaments(updatedTournaments);
  };

  const handleIncludePlayer = (tournamentId: string, weightRangeId: string, playerId: string) => {
    const updatedTournaments = TournamentsStorage.includePlayerInWeightRange(tournaments, tournamentId, weightRangeId, playerId);
    setTournaments(updatedTournaments);
  };

  

  const handleClearAllTournamentData = () => {
    if (window.confirm('Are you sure you want to clear all tournament data? This will remove all tournaments, selections, and filters.')) {
      // Clear all tournament-related localStorage using utility
      TournamentsStorage.clearAllTournamentData();
      
      // Reset all state to defaults
      setTournaments([]);
      
      setSelectedTournament(null);
      setSelectedWeightRange(null);
      setPlayerFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
      setAppliedFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
      setShowFilteredPlayers(false);
    }
  };

  const handleStartTournament = (tournamentId: string, weightRangeId: string) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    const weightRange = tournament?.weightRanges.find(wr => wr.id === weightRangeId);
    
    if (tournament && weightRange) {
      // Navigate to matches page with state
      navigate('/matches', {
        state: {
          tournament,
          weightRange
        }
      });
    }
  };

  // PDF Preview Modal Functions
  const getFilteredPlayers = (weightRange: WeightRange, tournament: Tournament) => {
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

  const handleShowPDFPreview = (tournament: Tournament, weightRange: WeightRange) => {
    setCurrentTournamentForPDF(tournament);
    setCurrentWeightRangeForPDF(weightRange);
    
    const previewData = openPreviewModal(
      tournament,
      weightRange,
      selectedPDFColumns,
      playersPerPage,
      availablePDFColumns,
      (wr) => getFilteredPlayers(wr, tournament)
    );
    
    setPreviewPages(previewData.pages);
    setCurrentPreviewPage(previewData.currentPage);
    setIsPDFPreviewModalOpen(true);
  };

  const handleExportPDF = async () => {
    if (!currentTournamentForPDF || !currentWeightRangeForPDF) return;

    try {
      const result = await generatePDF(
        currentTournamentForPDF,
        currentWeightRangeForPDF,
        selectedPDFColumns,
        playersPerPage,
        availablePDFColumns,
        (wr) => getFilteredPlayers(wr, currentTournamentForPDF)
      );
      
      alert(`PDF başarıyla oluşturuldu!\nDosya boyutu: ${result.fileSize}\nToplam sayfa: ${result.totalPages}\nSayfa başına oyuncu: ${playersPerPage}`);
      
    } catch (error) {
      // PDF oluşturulurken hata
      alert('PDF oluşturulurken bir hata oluştu.');
    }
  };

  const handleShowPDFColumnModal = (tournament: Tournament, weightRange: WeightRange) => {
    setCurrentTournamentForPDF(tournament);
    setCurrentWeightRangeForPDF(weightRange);
    setIsPDFColumnModalOpen(true);
  };

  return (
    <>
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-8 px-2">
      <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="backdrop-blur-md bg-white/80 rounded-2xl border border-gray-200 shadow-2xl p-6 transition-all duration-300">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight drop-shadow-sm">Tournaments</h1>
              <p className="text-base text-gray-500 mt-1">Total Tournaments: {tournaments.length}</p>
            </div>
            <div className="flex flex-wrap gap-3">
            <button
              onClick={handleClearAllTournamentData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-base font-semibold"
            >
              Clear All Data
            </button>
            <button
              onClick={() => {
                setIsEditMode(false);
                setEditingTournamentId(null);
                setNewTournamentName('');
                setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
                setCreateTournamentGenderFilter(null);
                setCreateTournamentHandPreferenceFilter(null);
                setCreateTournamentBirthYearMin(null);
                setCreateTournamentBirthYearMax(null);
                setIsCreateModalOpen(true);
              }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
            >
              Create Tournament
            </button>
          </div>
        </div>
        
        {/* Tournaments List */}
          <div className="space-y-6">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No tournaments yet</h3>
                <p className="text-gray-600 mb-6">Create your first tournament to get started</p>
                          <button
                            onClick={() => {
                    setIsEditMode(false);
                    setEditingTournamentId(null);
                    setNewTournamentName('');
                    setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
                    setCreateTournamentGenderFilter(null);
                    setCreateTournamentHandPreferenceFilter(null);
                    setCreateTournamentBirthYearMin(null);
                    setCreateTournamentBirthYearMax(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
                >
                  Create First Tournament
                          </button>
                        </div>
            ) : (
              tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  players={players}
                  onToggle={toggleTournament}
                  onEdit={handleEditTournament}
                  onDelete={handleDeleteTournament}
                  onSelectWeightRange={handleSelectWeightRange}
                  onStartTournament={handleStartTournament}
                  onExcludePlayer={handleExcludePlayer}
                  onIncludePlayer={handleIncludePlayer}
                  getAvailablePlayersCount={getAvailablePlayersCount}
                  selectedWeightRange={selectedWeightRange}
                  selectedTournament={selectedTournament}
                  onShowPDFPreview={handleShowPDFPreview}
                  onShowPDFColumnModal={handleShowPDFColumnModal}
                />
              ))
            )}
        </div>

        </div>
      </div>
    </div>

    {/* PDF Column Selection Modal - Moved outside main content */}
    {isPDFColumnModalOpen && (
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[9998] overflow-hidden"
        onClick={() => {
          setIsPDFColumnModalOpen(false);
          setCurrentTournamentForPDF(null);
          setCurrentWeightRangeForPDF(null);
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl p-8 w-[500px] max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">PDF Kolon Seçimi</h3>
              <p className="text-sm text-gray-600">PDF'te görünmesini istediğiniz kolonları seçin</p>
            </div>
            <button
              onClick={() => setIsPDFColumnModalOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-4">
              {availablePDFColumns.map((column) => (
                <label key={column.id} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={selectedPDFColumns.includes(column.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPDFColumns([...selectedPDFColumns, column.id]);
                      } else {
                        setSelectedPDFColumns(selectedPDFColumns.filter(id => id !== column.id));
                      }
                    }}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-700">{column.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Sayfa Başına Oyuncu Sayısı
            </label>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Min: 1</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Max: 40</span>
            </div>
            <input
              type="number"
              min="1"
              max="40"
              value={playersPerPage || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  setPlayersPerPage(0);
                } else {
                  const numValue = parseInt(value);
                  if (numValue >= 1 && numValue <= 40) {
                    setPlayersPerPage(numValue);
                  }
                }
              }}
              onBlur={(e) => {
                if (!e.target.value || parseInt(e.target.value) < 1) {
                  setPlayersPerPage(33);
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-semibold"
              placeholder="33"
            />
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (selectedPDFColumns.length === 0) {
                  alert('En az bir kolon seçmelisiniz!');
                  return;
                }
                setIsPDFColumnModalOpen(false);
                if (currentTournamentForPDF && currentWeightRangeForPDF) {
                  handleShowPDFPreview(currentTournamentForPDF, currentWeightRangeForPDF);
                }
              }}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-base font-semibold"
            >
              Önizleme Aç
            </button>
          </div>
        </div>
      </div>
    )}

    {/* PDF Preview Modal - Moved outside main content */}
    {isPDFPreviewModalOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999] overflow-hidden"
        onClick={() => {
          setIsPDFPreviewModalOpen(false);
          setCurrentTournamentForPDF(null);
          setCurrentWeightRangeForPDF(null);
          setPreviewPages([]);
          setCurrentPreviewPage(0);
        }}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-5xl max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">PDF Önizleme</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsPDFPreviewModalOpen(false);
                  handleExportPDF();
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-sm font-semibold"
              >
                PDF İndir
              </button>
              <button
                onClick={() => {
                  setIsPDFPreviewModalOpen(false);
                  if (currentTournamentForPDF && currentWeightRangeForPDF) {
                    handleShowPDFColumnModal(currentTournamentForPDF, currentWeightRangeForPDF);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
              >
                Kolon Seçimine Dön
              </button>
              <button
                onClick={() => setIsPDFPreviewModalOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 p-8 rounded-xl border-2 border-dashed border-gray-300">

            {/* Page Navigation - Fixed Position */}
            {previewPages.length > 1 && (
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-3 mb-4 rounded-t-lg">
                <div className="flex justify-center items-center gap-4">
                  <button
                    onClick={() => setCurrentPreviewPage(Math.max(0, currentPreviewPage - 1))}
                    disabled={currentPreviewPage === 0}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold"
                  >
                    ← Önceki Sayfa
                  </button>
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                    Sayfa {currentPreviewPage + 1} / {previewPages.length}
                  </span>
                  <button
                    onClick={() => setCurrentPreviewPage(Math.min(previewPages.length - 1, currentPreviewPage + 1))}
                    disabled={currentPreviewPage === previewPages.length - 1}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold"
                  >
                    Sonraki Sayfa →
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <div 
                className="preview-content"
                style={{
                  width: '210mm',
                  height: 'auto',
                  minHeight: '297mm',
                  padding: '10mm 15mm 15mm 15mm',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  overflow: 'visible',
                  border: '1px solid #ccc',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  position: 'relative',
                  transform: 'translateY(-35px)'
                }}
                dangerouslySetInnerHTML={{ __html: previewPages[currentPreviewPage] }}
              />
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Bu, PDF'inizin nasıl görüneceğinin önizlemesidir. PDF'i indirmek için üstteki "PDF İndir" butonunu kullanabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Create Tournament Modal - Moved outside main content */}
        {isCreateModalOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 overflow-hidden"
        onClick={() => {
          setIsCreateModalOpen(false);
          setIsEditMode(false);
          setEditingTournamentId(null);
          setNewTournamentName('');
          setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
          setCreateTournamentGenderFilter(null);
          setCreateTournamentHandPreferenceFilter(null);
          setCreateTournamentBirthYearMin(null);
          setCreateTournamentBirthYearMax(null);
          setPlayerFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
          setAppliedFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
        }}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform-none"
          onClick={(e) => e.stopPropagation()}
        >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex-shrink-0">
                <h2 className="text-3xl font-bold text-white">
                  {isEditMode ? 'Edit Tournament' : 'Create New Tournament'}
                </h2>
                <p className="text-blue-100 mt-2">
                  {isEditMode ? 'Update your tournament settings and weight ranges' : 'Set up your tournament with custom weight ranges and filters'}
                </p>
              </div>
              
              {/* Content Area - Scrollable */}
              <div className="flex-1 p-8 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-6">
                    {/* Tournament Name */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                        Tournament Details
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tournament Name *
                        </label>
                        <input
                          type="text"
                          value={newTournamentName}
                          onChange={(e) => setNewTournamentName(e.target.value)}
                          placeholder="e.g., Youth Men's Left Arm Championship"
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                        />
                      </div>
                    </div>

                    {/* Tournament Filters */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                        Tournament Filters
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender Restriction
                          </label>
                          <select
                            value={isEditMode ? (playerFilters.gender || '') : (createTournamentGenderFilter || '')}
                            onChange={(e) => {
                              if (isEditMode) {
                                setPlayerFilters({...playerFilters, gender: e.target.value as 'male' | 'female' | null || null});
                              } else {
                                setCreateTournamentGenderFilter(e.target.value as 'male' | 'female' | null || null);
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                          >
                            <option value="">All Genders</option>
                            <option value="male">Male Only</option>
                            <option value="female">Female Only</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hand Preference
                          </label>
                          <select
                            value={isEditMode ? (playerFilters.handPreference || '') : (createTournamentHandPreferenceFilter || '')}
                            onChange={(e) => {
                              if (isEditMode) {
                                setPlayerFilters({...playerFilters, handPreference: e.target.value as 'left' | 'right' | null || null});
                              } else {
                                setCreateTournamentHandPreferenceFilter(e.target.value as 'left' | 'right' | null || null);
                              }
                            }}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800"
                          >
                            <option value="">All Hand Preferences</option>
                            <option value="left">Left Hand Only</option>
                            <option value="right">Right Hand Only</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Birth Year Filter */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Birth Year
                          </label>
                          <input
                            type="number"
                            value={createTournamentBirthYearMin || ''}
                            onChange={(e) => setCreateTournamentBirthYearMin(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="e.g., 1990"
                            min="1900"
                            max="2020"
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Birth Year
                          </label>
                          <input
                            type="number"
                            value={createTournamentBirthYearMax || ''}
                            onChange={(e) => setCreateTournamentBirthYearMax(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="e.g., 2005"
                            min="1900"
                            max="2020"
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Weight Ranges */}
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                          <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                          Weight Ranges ({weightRanges.length})
                        </h3>
                        <button
                          onClick={handleAddWeightRange}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <span className="text-lg">+</span>
                          Add Range
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {weightRanges.map((range, index) => (
                          <div key={range.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-600">Range #{index + 1}</span>
                              {weightRanges.length > 1 && (
                                <button
                                  onClick={() => handleRemoveWeightRange(range.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1 transition-colors"
                                  title="Remove this range"
                                >
                                  <span className="text-lg">×</span>
                                </button>
                              )}
                            </div>
                            
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Division Name
                                </label>
                                <input
                                  type="text"
                                  value={range.name}
                                  onChange={(e) => handleWeightRangeChange(range.id, 'name', e.target.value)}
                                  placeholder="e.g., Lightweight Division"
                                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Min Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={range.min || ''}
                                    onChange={(e) => handleWeightRangeChange(range.id, 'min', parseFloat(e.target.value) || 0)}
                                    placeholder="40.0"
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Max Weight (kg)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={range.max || ''}
                                    onChange={(e) => handleWeightRangeChange(range.id, 'max', parseFloat(e.target.value) || 0)}
                                    placeholder="50.0"
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                                  />
                                </div>
                              </div>
                              {range.min > 0 && range.max > 0 && (
                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  Range: {range.min.toFixed(1)} - {range.max.toFixed(1)} kg
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

              {/* Footer - Always visible */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
                <div className="text-sm text-gray-600">
                  {newTournamentName.trim() && weightRanges.filter(r => r.name.trim() && r.min > 0 && r.max > 0).length > 0 
                    ? (isEditMode ? "✓ Ready to save changes" : "✓ Ready to create tournament")
                    : "Please complete all fields"
                  }
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setIsEditMode(false);
                      setEditingTournamentId(null);
                      setNewTournamentName('');
                      setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
                      setCreateTournamentGenderFilter(null);
                      setCreateTournamentHandPreferenceFilter(null);
                      setPlayerFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
                      setAppliedFilters({gender: null, handPreference: null, weightMin: null, weightMax: null});
                    }}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={isEditMode ? handleSaveEdit : handleCreateTournament}
                    disabled={!newTournamentName.trim() || weightRanges.filter(r => r.name.trim() && r.min > 0 && r.max > 0).length === 0}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isEditMode ? 'Save Changes' : 'Create Tournament'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default Tournaments; 