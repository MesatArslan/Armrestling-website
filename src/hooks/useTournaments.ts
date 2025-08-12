import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStorage } from '../storage/StorageContext';
import type { Tournament as RepoTournament } from '../storage/schemas';

export type PlayerFilters = {
  gender: 'male' | 'female' | null;
  handPreference: 'left' | 'right' | null;
  weightMin: number | null;
  weightMax: number | null;
};

type TournamentsState = {
  tournaments: RepoTournament[];
  selectedTournamentId: string | null;
  selectedWeightRangeId: string | null;
  playerFilters: PlayerFilters;
  isLoading: boolean;
};

export function useTournaments() {
  const { tournaments: tournamentsRepo } = useStorage();
  const [state, setState] = useState<TournamentsState>({
    tournaments: [],
    selectedTournamentId: null,
    selectedWeightRangeId: null,
    playerFilters: { gender: null, handPreference: null, weightMin: null, weightMax: null },
    isLoading: true,
  });

  useEffect(() => {
    try {
      const tournaments = tournamentsRepo.getAll() as RepoTournament[];
      const selectedTournamentId = tournamentsRepo.getSelectedTournament();
      const selectedWeightRangeId = tournamentsRepo.getSelectedWeightRange();
      const playerFilters = tournamentsRepo.getPlayerFilters();
      setState({
        tournaments,
        selectedTournamentId,
        selectedWeightRangeId,
        playerFilters,
        isLoading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [tournamentsRepo]);

  const saveTournaments = useCallback((next: RepoTournament[]) => {
    setState((prev) => ({ ...prev, tournaments: next }));
    try { tournamentsRepo.saveAll(next as any[]); } catch {}
  }, [tournamentsRepo]);

  const setSelectedTournament = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedTournamentId: id }));
    try { tournamentsRepo.setSelectedTournament(id); } catch {}
  }, [tournamentsRepo]);

  const setSelectedWeightRange = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedWeightRangeId: id }));
    try { tournamentsRepo.setSelectedWeightRange(id); } catch {}
  }, [tournamentsRepo]);

  const savePlayerFilters = useCallback((filters: PlayerFilters) => {
    setState(prev => ({ ...prev, playerFilters: filters }));
    try { tournamentsRepo.savePlayerFilters(filters); } catch {}
  }, [tournamentsRepo]);

  const clearAllTournamentData = useCallback(() => {
    try {
      tournamentsRepo.clear();
      tournamentsRepo.setSelectedTournament(null);
      tournamentsRepo.setSelectedWeightRange(null);
      tournamentsRepo.clearPlayerFilters();
    } catch {}
    setState({
      tournaments: [],
      selectedTournamentId: null,
      selectedWeightRangeId: null,
      playerFilters: { gender: null, handPreference: null, weightMin: null, weightMax: null },
      isLoading: false,
    });
  }, [tournamentsRepo]);

  return useMemo(() => ({
    tournaments: state.tournaments,
    selectedTournamentId: state.selectedTournamentId,
    selectedWeightRangeId: state.selectedWeightRangeId,
    playerFilters: state.playerFilters,
    isLoading: state.isLoading,
    saveTournaments,
    setSelectedTournament,
    setSelectedWeightRange,
    savePlayerFilters,
    clearAllTournamentData,
  }), [state, saveTournaments, setSelectedTournament, setSelectedWeightRange, savePlayerFilters, clearAllTournamentData]);
}


