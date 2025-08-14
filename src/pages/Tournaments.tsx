import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import type { Player } from '../types';
import TournamentCard from '../components/UI/TournamentCard';
import type { Tournament as StorageTournament, WeightRange } from '../storage/schemas';
import { type Column } from '../utils/playersStorage';
import { openPreviewModal, generatePDF, generateCombinedPreviewPages, generateCombinedTournamentPDF } from '../utils/pdfGenerator';
import { useTournaments } from '../hooks/useTournaments';
import { usePlayers } from '../hooks/usePlayers';

type UITournament = Omit<StorageTournament, 'isExpanded'> & { isExpanded: boolean };

// Tournaments sayfası için Player interface'ini genişletiyoruz
interface ExtendedPlayer extends Player {
  [key: string]: any;
}

const Tournaments = () => {
  const { t } = useTranslation();
  const { tournaments: repoTournaments, selectedTournamentId, selectedWeightRangeId, playerFilters: repoFilters, isLoading, saveTournaments, setSelectedTournament, setSelectedWeightRange, savePlayerFilters, clearAllTournamentData } = useTournaments();
  const { players: repoPlayers, columns: playerColumns } = usePlayers();
  const [tournaments, setTournaments] = useState<UITournament[]>([]);
  const [players, setPlayers] = useState<ExtendedPlayer[]>([]);
  const [selectedWeightRange, setSelectedWeightRangeLocal] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournamentLocal] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [weightRanges, setWeightRanges] = useState<WeightRange[]>([
    { id: uuidv4(), name: '', min: 0, max: 0 }
  ]);
  const [playerFilters, setPlayerFilters] = useState<import('../hooks/useTournaments').PlayerFilters>({
    gender: null,
    handPreference: null,
    weightMin: null,
    weightMax: null,
  });
  const [, setAppliedFilters] = useState<import('../hooks/useTournaments').PlayerFilters>({
    gender: null,
    handPreference: null,
    weightMin: null,
    weightMax: null,
  });
  const [, setShowFilteredPlayers] = useState(false);
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
  const [currentTournamentForPDF, setCurrentTournamentForPDF] = useState<UITournament | null>(null);
  const [currentWeightRangeForPDF, setCurrentWeightRangeForPDF] = useState<WeightRange | null>(null);
  const [isPDFColumnModalOpen, setIsPDFColumnModalOpen] = useState(false);
  const [isBulkPDFModalOpen, setIsBulkPDFModalOpen] = useState(false);
  const [selectedBulkRanges, setSelectedBulkRanges] = useState<Record<string, boolean>>({});
  const [isBulkPreviewMode, setIsBulkPreviewMode] = useState<boolean>(false);
  const [bulkPlayersPerPage, setBulkPlayersPerPage] = useState<number>(33);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const hideProgressTimer = React.useRef<number | null>(null);

  // Toggle to disable all background sync effects (diagnostic/safe mode)
  const NO_BACKGROUND_SYNC = true;
  const [hasInitialSync, setHasInitialSync] = useState(false);

  // Helpers: stable deep equal (sorts object keys to avoid stringify order issues)
  const normalizeForCompare = (val: any): any => {
    if (Array.isArray(val)) return val.map(normalizeForCompare);
    if (val && typeof val === 'object') {
      const keys = Object.keys(val).sort();
      const out: Record<string, any> = {};
      for (const k of keys) out[k] = normalizeForCompare(val[k]);
      return out;
    }
    return val;
  };
  const deepEqual = (a: any, b: any) => {
    try { return JSON.stringify(normalizeForCompare(a)) === JSON.stringify(normalizeForCompare(b)); } catch { return false; }
  };

  // Normalize tournaments for compare/save: drop UI fields and empty arrays
  const canonicalizeTournaments = (arr: any[]): any[] => {
    return (arr || []).map((t: any) => {
      const { isExpanded, ...rest } = t || {};
      return {
        ...rest,
        weightRanges: (rest.weightRanges || []).map((wr: any) => {
          const { excludedPlayerIds, ...wrRest } = wr || {};
          // Treat empty/undefined excludedPlayerIds the same: omit
          if (!excludedPlayerIds || (Array.isArray(excludedPlayerIds) && excludedPlayerIds.length === 0)) {
            return { ...wrRest };
          }
          return { ...wrRest, excludedPlayerIds: [...excludedPlayerIds] };
        })
      };
    });
  };

  // One-shot initial sync on page entry to show saved data
  useEffect(() => {
    if (isLoading || hasInitialSync) return;
    // players
    setPlayers(repoPlayers as any);
    // tournaments (attach UI-only flag)
    const uiTournaments = (repoTournaments as StorageTournament[]).map(t => ({ ...t, isExpanded: Boolean((t as any).isExpanded) }));
    setTournaments(uiTournaments);
    // selection ids
    setSelectedTournamentLocal(selectedTournamentId || null);
    setSelectedWeightRangeLocal(selectedWeightRangeId || null);
    // filters (UI only)
    setPlayerFilters(repoFilters as any);
    setAppliedFilters(repoFilters as any);
    setShowFilteredPlayers(true);
    setHasInitialSync(true);
  }, [isLoading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isCreateModalOpen || isPDFPreviewModalOpen || isPDFColumnModalOpen || isBulkPDFModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCreateModalOpen, isPDFPreviewModalOpen, isPDFColumnModalOpen, isBulkPDFModalOpen]);

  // Sync from repositories (guarded by stable snapshot to prevent loops)
  const lastRepoSnapshotRef = React.useRef<{
    players: string;
    tournaments: string;
    selectedTournamentId: string | null;
    selectedWeightRangeId: string | null;
    filters: string;
  }>({ players: '', tournaments: '', selectedTournamentId: null, selectedWeightRangeId: null, filters: '' });

  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    if (isLoading) return;

    const playersSnap = JSON.stringify(normalizeForCompare(repoPlayers));
    const tournamentsSnap = JSON.stringify(normalizeForCompare(canonicalizeTournaments(repoTournaments as any)));
    const filtersSnap = JSON.stringify(normalizeForCompare(repoFilters));
    const sameSnapshot =
      lastRepoSnapshotRef.current.players === playersSnap &&
      lastRepoSnapshotRef.current.tournaments === tournamentsSnap &&
      lastRepoSnapshotRef.current.selectedTournamentId === (selectedTournamentId || null) &&
      lastRepoSnapshotRef.current.selectedWeightRangeId === (selectedWeightRangeId || null) &&
      lastRepoSnapshotRef.current.filters === filtersSnap;

    if (sameSnapshot) return;

    // Update local states from repo
    if (!deepEqual(players, repoPlayers)) setPlayers(repoPlayers as any);

    const uiTournaments = (repoTournaments as StorageTournament[]).map(t => ({ ...t, isExpanded: Boolean((t as any).isExpanded) }));
    if (!deepEqual(canonicalizeTournaments(tournaments), canonicalizeTournaments(uiTournaments))) {
      setTournaments(uiTournaments);
    }

    const selTid = selectedTournamentId || null;
    if (selectedTournament !== selTid) setSelectedTournamentLocal(selTid);

    const selWrid = selectedWeightRangeId || null;
    if (selectedWeightRange !== selWrid) setSelectedWeightRangeLocal(selWrid);

    if (!deepEqual(playerFilters, repoFilters)) setPlayerFilters(repoFilters as any);

    // Save snapshot
    lastRepoSnapshotRef.current = {
      players: playersSnap,
      tournaments: tournamentsSnap,
      selectedTournamentId: selTid,
      selectedWeightRangeId: selWrid,
      filters: filtersSnap,
    };
  }, [isLoading, repoPlayers, repoTournaments, selectedTournamentId, selectedWeightRangeId, repoFilters]);

  // Load PDF columns from Players hook
  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    const columns = playerColumns;
    if (!deepEqual(availablePDFColumns, columns)) {
      setAvailablePDFColumns(columns);
    }
    const visibleColumnIds = columns.filter(col => col.visible).map(col => col.id);
    if (!deepEqual(selectedPDFColumns, visibleColumnIds)) {
      setSelectedPDFColumns(visibleColumnIds);
    }
  }, [playerColumns]);

  // NOTE: We avoid persisting here to prevent loops. We already call saveTournaments
  // from explicit user actions (create/edit/delete/include/exclude).

  // Persist selection only on explicit UI actions (see handleSelectWeightRange)

  // Persist filters only when they actually differ from repo
  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    if (isLoading) return;
    if (!deepEqual(playerFilters, repoFilters)) {
      savePlayerFilters(playerFilters as any);
    }
  }, [playerFilters, repoFilters, isLoading]);

  // Derive UI-only flags from filters (not persisted)
  useEffect(() => {
    if (NO_BACKGROUND_SYNC) return;
    setAppliedFilters(playerFilters);
    setShowFilteredPlayers(true);
  }, [playerFilters.gender, playerFilters.handPreference, playerFilters.weightMin, playerFilters.weightMax]);

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
      setSelectedTournamentLocal(tournamentId);
      setSelectedWeightRangeLocal(weightRangeId);
      // Persist selection on explicit action
      try { setSelectedTournament(tournamentId); } catch {}
      try { setSelectedWeightRange(weightRangeId); } catch {}
      
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

    const newTournament: UITournament = {
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

    const updatedTournaments: UITournament[] = [...tournaments, newTournament];
    setTournaments(updatedTournaments);
    saveTournaments(updatedTournaments as any);
    setNewTournamentName('');
    setWeightRanges([{ id: uuidv4(), name: '', min: 0, max: 0 }]);
    setCreateTournamentGenderFilter(null);
    setCreateTournamentHandPreferenceFilter(null);
    setCreateTournamentBirthYearMin(null);
    setCreateTournamentBirthYearMax(null);
    setIsCreateModalOpen(false);
  };

  const handleEditTournament = (tournament: UITournament) => {
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
    const updatedTournaments = tournaments.filter(t => t.id !== tournamentId);
    setTournaments(updatedTournaments);
    saveTournaments(updatedTournaments as any);
  };

  const handleSaveEdit = () => {
    if (!editingTournamentId || !newTournamentName.trim()) return;

    // Validate weight ranges
    const validRanges = weightRanges.filter(range => 
      range.name.trim() && range.min > 0 && range.max > 0 && range.max > range.min
    );

    if (validRanges.length === 0) return;

    const base = tournaments.find(t => t.id === editingTournamentId)!;
    const updatedTournament: UITournament = {
      ...base,
      name: newTournamentName.trim(),
      weightRanges: validRanges.map(range => {
        // Find existing weight range to preserve excludedPlayerIds
        const existingRange = base.weightRanges.find(wr => wr.id === range.id);
        return {
          ...range,
          excludedPlayerIds: existingRange?.excludedPlayerIds || []
        };
      }),
      isExpanded: Boolean(base.isExpanded),
      genderFilter: playerFilters.gender,
      handPreferenceFilter: playerFilters.handPreference,
      birthYearMin: createTournamentBirthYearMin,
      birthYearMax: createTournamentBirthYearMax,
    };
    
    const updatedTournaments = tournaments.map(t => t.id === updatedTournament.id ? updatedTournament : t);
    setTournaments(updatedTournaments);
    // Persist edits immediately
    try { saveTournaments(updatedTournaments as any); } catch {}

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


  const getAvailablePlayersCount = (weightRange: WeightRange, tournament?: UITournament) => {
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
    const updated = tournaments.map(t => t.id === tournamentId ? ({
      ...t,
      weightRanges: t.weightRanges.map(wr => wr.id === weightRangeId ? {
        ...wr,
        excludedPlayerIds: [...(wr.excludedPlayerIds || []), playerId]
      } : wr)
    } as UITournament) : t);
    setTournaments(updated);
    saveTournaments(updated as any);
  };

  const handleIncludePlayer = (tournamentId: string, weightRangeId: string, playerId: string) => {
    const updated = tournaments.map(t => t.id === tournamentId ? ({
      ...t,
      weightRanges: t.weightRanges.map(wr => wr.id === weightRangeId ? {
        ...wr,
        excludedPlayerIds: (wr.excludedPlayerIds || []).filter(id => id !== playerId)
      } : wr)
    } as UITournament) : t);
    setTournaments(updated);
    saveTournaments(updated as any);
  };

  

  const handleClearAllTournamentData = () => {
    if (window.confirm('Are you sure you want to clear all tournament data? This will remove all tournaments, selections, and filters.')) {
      clearAllTournamentData();
      setTournaments([]);
      setSelectedTournamentLocal(null);
      setSelectedWeightRangeLocal(null);
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
  const getFilteredPlayers = (weightRange: WeightRange, tournament: UITournament) => {
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

  const handleShowPDFPreview = (tournament: UITournament, weightRange: WeightRange) => {
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
      setIsExporting(true);
      setPdfProgress(0);
      await generatePDF(
        currentTournamentForPDF,
        currentWeightRangeForPDF,
        selectedPDFColumns,
        playersPerPage,
        availablePDFColumns,
        (wr) => getFilteredPlayers(wr, currentTournamentForPDF),
        (p) => setPdfProgress(p)
      );
      
    } catch (error) {
      // PDF oluşturulurken hata
    } finally {
      // Hold 100% for a brief moment to give a nice finish
      if (pdfProgress < 100) {
        setPdfProgress(100);
      }
      if (hideProgressTimer.current) {
        window.clearTimeout(hideProgressTimer.current);
      }
      hideProgressTimer.current = window.setTimeout(() => {
        setIsExporting(false);
        setPdfProgress(0);
      }, 800);
    }
  };

  const handleShowPDFColumnModal = (tournament: UITournament, weightRange: WeightRange) => {
    setCurrentTournamentForPDF(tournament);
    setCurrentWeightRangeForPDF(weightRange);
    // Initialize available/selected columns from Players repo when opening the modal
    try {
      const cols = Array.isArray(playerColumns) && playerColumns.length > 0 ? playerColumns : availablePDFColumns;
      if (cols && cols.length > 0) {
        if (!deepEqual(availablePDFColumns, cols)) setAvailablePDFColumns(cols);
        const visibleIds = cols.filter((c) => c.visible).map((c) => c.id);
        if (visibleIds.length > 0 && !deepEqual(selectedPDFColumns, visibleIds)) {
          setSelectedPDFColumns(visibleIds);
        }
      }
    } catch {}
    setIsPDFColumnModalOpen(true);
  };

  return (
    <>
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col items-center justify-start py-8 px-2">
      <div className="w-full max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="backdrop-blur-md bg-white/80 rounded-2xl border border-gray-200 shadow-2xl p-4 sm:p-6 transition-all duration-300">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight drop-shadow-sm">{t('tournaments.title')}</h1>
              <p className="text-base text-gray-500 mt-1">{t('tournaments.totalTournaments')}: {tournaments.length}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              
            <button
              onClick={handleClearAllTournamentData}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-sm sm:text-base font-semibold"
            >
              {t('tournaments.clearAllData')}
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
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-sm sm:text-base font-semibold"
            >
              {t('tournaments.createTournament')}
            </button>
          </div>
        </div>
        
        {/* Tournaments List */}
          <div className="space-y-6 max-w-7xl mx-auto">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('tournaments.noTournamentsYet')}</h3>
                <p className="text-gray-600 mb-6">{t('tournaments.createFirstTournament')}</p>
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
                  {t('tournaments.createFirstTournamentButton')}
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
                  onOpenBulkPDF={(t) => {
                    const defaults: Record<string, boolean> = {};
                    t.weightRanges.forEach(wr => { defaults[wr.id] = true; });
                    setSelectedBulkRanges(defaults);
                    // Initialize available/selected columns before opening bulk modal
                    try {
                      const cols = Array.isArray(playerColumns) && playerColumns.length > 0 ? playerColumns : availablePDFColumns;
                      if (cols && cols.length > 0) {
                        if (!deepEqual(availablePDFColumns, cols)) setAvailablePDFColumns(cols);
                        const visibleIds = cols.filter((c) => c.visible).map((c) => c.id);
                        if (visibleIds.length > 0 && !deepEqual(selectedPDFColumns, visibleIds)) {
                          setSelectedPDFColumns(visibleIds);
                        }
                      }
                    } catch {}
                    setIsBulkPDFModalOpen(true);
                    setCurrentTournamentForPDF(t);
                    setIsBulkPreviewMode(false);
                  }}
                />
              ))
            )}
        </div>

        </div>
      </div>
    </div>

    {/* Top-right export progress indicator */}
    {isExporting && (
      <div className="fixed top-4 right-4 z-[10000] transition-opacity duration-300">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 min-w-[220px]">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-800">{t('tournamentCard.downloadPDF')}</div>
            <div className="mt-1 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${pdfProgress}%` }} />
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-700 w-10 text-right">{pdfProgress}%</div>
        </div>
      </div>
    )}

    {/* PDF Column Selection Modal - Moved outside main content */}
    {isBulkPDFModalOpen && currentTournamentForPDF && (
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-[9998] overflow-hidden"
        onClick={() => setIsBulkPDFModalOpen(false)}
      >
        <div 
          className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-3xl max-h-[85vh] overflow-y-auto mx-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('tournamentCard.pdfPreview')}</h3>
              <p className="text-sm text-gray-600">{currentTournamentForPDF.name} — Fikstürleri seçin, kolonları belirleyin.</p>
            </div>
            <button
              onClick={() => setIsBulkPDFModalOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Select fixtures */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Fikstür Seçimi</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {currentTournamentForPDF.weightRanges.map(wr => (
                <label key={wr.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition">
                  <input
                    type="checkbox"
                    checked={!!selectedBulkRanges[wr.id]}
                    onChange={(e) => setSelectedBulkRanges(prev => ({ ...prev, [wr.id]: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-800 truncate">{wr.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Select columns */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">PDF Kolonları</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <span className="text-sm font-medium text-gray-700">{
                    ['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'].includes(column.id)
                      ? t(`players.${column.id}`)
                      : column.name
                  }</span>
                </label>
              ))}
            </div>
          </div>

          {/* Players per page for bulk generation */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">{t('tournamentCard.playersPerPage')}</h4>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t('tournamentCard.min')}: 1</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t('tournamentCard.max')}: 40</span>
            </div>
            <input
              type="number"
              min={1}
              max={40}
              value={bulkPlayersPerPage || ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') {
                  setBulkPlayersPerPage(0);
                } else {
                  const n = parseInt(v);
                  if (n >= 1 && n <= 40) setBulkPlayersPerPage(n);
                }
              }}
              onBlur={(e) => {
                if (!e.target.value || parseInt(e.target.value) < 1) setBulkPlayersPerPage(33);
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-base sm:text-lg font-semibold"
              placeholder="33"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsBulkPDFModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors duration-200 text-sm font-semibold rounded-lg"
            >
              {t('common.close')}
            </button>
              <button
              onClick={() => {
                const selectedRanges = currentTournamentForPDF!.weightRanges.filter(wr => selectedBulkRanges[wr.id]);
                if (selectedRanges.length === 0) return;
                const pages = generateCombinedPreviewPages(
                  currentTournamentForPDF!,
                  selectedRanges,
                  selectedPDFColumns,
                  bulkPlayersPerPage,
                  availablePDFColumns,
                  (wr) => {
                    return players.filter((player) => {
                      if (wr.excludedPlayerIds?.includes(player.id)) return false;
                      const matchesWeight = Number(player.weight || 0) >= wr.min && Number(player.weight || 0) <= wr.max;
                      const matchesTournamentGender = !currentTournamentForPDF?.genderFilter || player.gender === currentTournamentForPDF?.genderFilter;
                      const matchesTournamentHand = !currentTournamentForPDF?.handPreferenceFilter || player.handPreference === currentTournamentForPDF?.handPreferenceFilter || player.handPreference === 'both';
                      let matchesBirthYear = true;
                      if ((currentTournamentForPDF?.birthYearMin || currentTournamentForPDF?.birthYearMax) && player.birthday) {
                        const y = new Date(player.birthday).getFullYear();
                        matchesBirthYear = (!currentTournamentForPDF?.birthYearMin || y >= currentTournamentForPDF?.birthYearMin) && (!currentTournamentForPDF?.birthYearMax || y <= currentTournamentForPDF?.birthYearMax);
                      }
                      return matchesWeight && matchesTournamentGender && matchesTournamentHand && matchesBirthYear;
                    });
                  }
                );
                setPreviewPages(pages);
                setCurrentPreviewPage(0);
                setIsBulkPreviewMode(true);
                setIsBulkPDFModalOpen(false);
                setIsPDFPreviewModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-semibold"
            >
              {t('tournamentCard.openPreview')}
            </button>
          </div>
        </div>
      </div>
    )}
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
          className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md sm:max-w-lg max-h-[85vh] overflow-y-auto mx-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('tournamentCard.pdfColumnSelection')}</h3>
              <p className="text-sm text-gray-600">{t('tournamentCard.selectColumnsForPDF')}</p>
            </div>
            <button
              onClick={() => setIsPDFColumnModalOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <span className="text-sm font-medium text-gray-700">{
  ['name', 'surname', 'weight', 'gender', 'handPreference', 'birthday'].includes(column.id)
    ? t(`players.${column.id}`)
    : column.name
}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('tournamentCard.playersPerPage')}
            </label>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t('tournamentCard.min')}: 1</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{t('tournamentCard.max')}: 40</span>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-base sm:text-lg font-semibold"
              placeholder="33"
            />
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (selectedPDFColumns.length === 0) {
                  alert(t('tournamentCard.atLeastOneColumn'));
                  return;
                }
                setIsPDFColumnModalOpen(false);
                if (currentTournamentForPDF && currentWeightRangeForPDF) {
                  handleShowPDFPreview(currentTournamentForPDF, currentWeightRangeForPDF);
                }
              }}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm sm:text-base font-semibold"
            >
              {t('tournamentCard.openPreview')}
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
          className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('tournamentCard.pdfPreview')}</h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setIsPDFPreviewModalOpen(false);
                  if (isBulkPreviewMode && currentTournamentForPDF) {
                    const selectedRanges = currentTournamentForPDF.weightRanges.filter(wr => selectedBulkRanges[wr.id]);
                    if (selectedRanges.length === 0) return;
                    try {
                      setIsExporting(true);
                      setPdfProgress(0);
                      await generateCombinedTournamentPDF(
                        currentTournamentForPDF,
                        selectedRanges,
                        selectedPDFColumns,
                        bulkPlayersPerPage,
                        availablePDFColumns,
                        (wr) => {
                          return players.filter((player) => {
                            if (wr.excludedPlayerIds?.includes(player.id)) return false;
                            const matchesWeight = Number(player.weight || 0) >= wr.min && Number(player.weight || 0) <= wr.max;
                            const matchesTournamentGender = !currentTournamentForPDF?.genderFilter || player.gender === currentTournamentForPDF?.genderFilter;
                            const matchesTournamentHand = !currentTournamentForPDF?.handPreferenceFilter || player.handPreference === currentTournamentForPDF?.handPreferenceFilter || player.handPreference === 'both';
                            let matchesBirthYear = true;
                            if ((currentTournamentForPDF?.birthYearMin || currentTournamentForPDF?.birthYearMax) && player.birthday) {
                              const y = new Date(player.birthday).getFullYear();
                              matchesBirthYear = (!currentTournamentForPDF?.birthYearMin || y >= currentTournamentForPDF?.birthYearMin) && (!currentTournamentForPDF?.birthYearMax || y <= currentTournamentForPDF?.birthYearMax);
                            }
                            return matchesWeight && matchesTournamentGender && matchesTournamentHand && matchesBirthYear;
                          });
                        },
                        (p) => setPdfProgress(p)
                      );
                    } catch (error) {
                    } finally {
                      if (pdfProgress < 100) setPdfProgress(100);
                      if (hideProgressTimer.current) window.clearTimeout(hideProgressTimer.current);
                      hideProgressTimer.current = window.setTimeout(() => {
                        setIsExporting(false);
                        setPdfProgress(0);
                      }, 800);
                    }
                    setIsBulkPreviewMode(false);
                  } else {
                    await handleExportPDF();
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-red-400 to-red-600 text-white rounded-lg shadow hover:from-red-500 hover:to-red-700 transition-all duration-200 text-xs sm:text-sm font-semibold"
              >
                {t('tournamentCard.downloadPDF')}
              </button>
              <button
                onClick={() => {
                  setIsPDFPreviewModalOpen(false);
                  if (isBulkPreviewMode) {
                    setIsBulkPDFModalOpen(true);
                  } else if (currentTournamentForPDF && currentWeightRangeForPDF) {
                    handleShowPDFColumnModal(currentTournamentForPDF, currentWeightRangeForPDF);
                  }
                }}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg shadow hover:from-blue-500 hover:to-blue-700 transition-all duration-200 text-xs sm:text-sm font-semibold"
              >
                {t('tournamentCard.returnToColumnSelection')}
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
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-xs sm:text-sm"
                  >
                    ← {t('tournamentCard.previousPage')}
                  </button>
                  <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">
                    {t('tournamentCard.page')} {currentPreviewPage + 1} / {previewPages.length}
                  </span>
                  <button
                    onClick={() => setCurrentPreviewPage(Math.min(previewPages.length - 1, currentPreviewPage + 1))}
                    disabled={currentPreviewPage === previewPages.length - 1}
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-semibold text-xs sm:text-sm"
                  >
                    {t('tournamentCard.nextPage')} →
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <div dangerouslySetInnerHTML={{ __html: previewPages[currentPreviewPage] }} />
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
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transform-none"
          onClick={(e) => e.stopPropagation()}
        >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 flex-shrink-0">
                <h2 className="text-3xl font-bold text-white">
                  {isEditMode ? t('tournaments.editTournament') : t('tournaments.createNewTournament')}
                </h2>
                <p className="text-blue-100 mt-2">
                  {isEditMode ? t('tournaments.updateTournamentSettings') : t('tournaments.setupTournament')}
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
                        {t('tournaments.details')}
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
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                        />
                      </div>
                    </div>

                    {/* Tournament Filters */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                        {t('tournaments.filters')}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tournaments.genderRestriction')}
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
                            <option value="">{t('tournaments.allGenders')}</option>
                            <option value="male">{t('players.maleOnly')}</option>
                            <option value="female">{t('players.femaleOnly')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tournaments.handPreference')}
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
                            <option value="">{t('tournaments.allHandPreferences')}</option>
                            <option value="left">{t('players.leftHandOnly')}</option>
                            <option value="right">{t('players.rightHandOnly')}</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Birth Year Filter */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tournaments.minBirthYear')}
                          </label>
                          <input
                            type="number"
                            value={createTournamentBirthYearMin || ''}
                            onChange={(e) => setCreateTournamentBirthYearMin(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={t('tournaments.minBirthYearPlaceholder')}
                            min="1900"
                            max="2020"
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('tournaments.maxBirthYear')}
                          </label>
                          <input
                            type="number"
                            value={createTournamentBirthYearMax || ''}
                            onChange={(e) => setCreateTournamentBirthYearMax(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={t('tournaments.maxBirthYearPlaceholder')}
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
                          {t('tournaments.weightRanges')} ({weightRanges.length})
                        </h3>
                        <button
                          onClick={handleAddWeightRange}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <span className="text-lg">+</span>
                          {t('tournaments.addRange')}
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {weightRanges.map((range, index) => (
                          <div key={range.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-600">{t('tournaments.range')} #{index + 1}</span>
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
                                  {t('tournaments.divisionName')}
                                </label>
                                <input
                                  type="text"
                                  value={range.name}
                                  onChange={(e) => handleWeightRangeChange(range.id, 'name', e.target.value)}
                                  placeholder={t('tournaments.divisionNamePlaceholder')}
                                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {t('tournaments.minWeight')}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={range.min || ''}
                                    onChange={(e) => handleWeightRangeChange(range.id, 'min', parseFloat(e.target.value) || 0)}
                                    placeholder={t('tournaments.minWeightPlaceholder')}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    {t('tournaments.maxWeight')}
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={range.max || ''}
                                    onChange={(e) => handleWeightRangeChange(range.id, 'max', parseFloat(e.target.value) || 0)}
                                    placeholder={t('tournaments.maxWeightPlaceholder')}
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-800 placeholder-gray-500"
                                  />
                                </div>
                              </div>
                              {range.min > 0 && range.max > 0 && (
                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
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

              {/* Footer - Always visible */}
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
                <div className="text-sm text-gray-600">
                  {newTournamentName.trim() && weightRanges.filter(r => r.name.trim() && r.min > 0 && r.max > 0).length > 0 
                    ? (isEditMode ? t('tournaments.readyToSave') : t('tournaments.readyToCreate'))
                    : t('tournaments.completeAllFields')
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
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={isEditMode ? handleSaveEdit : handleCreateTournament}
                    disabled={!newTournamentName.trim() || weightRanges.filter(r => r.name.trim() && r.min > 0 && r.max > 0).length === 0}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {isEditMode ? t('tournaments.saveChanges') : t('tournaments.createTournament')}
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