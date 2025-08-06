// Tournaments localStorage utility
// Bu dosya tournaments ile ilgili tüm localStorage işlemlerini merkezi olarak yönetir

export interface WeightRange {
  id: string;
  name: string;
  min: number;
  max: number;
  excludedPlayerIds?: string[];
}

export interface Tournament {
  id: string;
  name: string;
  weightRanges: WeightRange[];
  isExpanded: boolean;
  genderFilter?: 'male' | 'female' | null;
  handPreferenceFilter?: 'left' | 'right' | null;
  birthYearMin?: number | null;
  birthYearMax?: number | null;
}

export interface PlayerFilters {
  gender: 'male' | 'female' | null;
  handPreference: 'left' | 'right' | null;
  weightMin: number | null;
  weightMax: number | null;
}

export interface CurrentTournamentState {
  tournament: Tournament;
  weightRange: WeightRange;
  timestamp: string;
}

export const TournamentsStorage = {
  // Tournaments listesi
  saveTournaments: (tournaments: Tournament[]) => {
    try {
      localStorage.setItem('arm-wrestling-tournaments', JSON.stringify(tournaments));
    } catch (error) {
      // Error saving tournaments to localStorage
    }
  },

  getTournaments: (): Tournament[] => {
    try {
      const saved = localStorage.getItem('arm-wrestling-tournaments');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      // Error loading tournaments from localStorage
      return [];
    }
  },

  clearTournaments: () => {
    localStorage.removeItem('arm-wrestling-tournaments');
  },

  // Seçili tournament
  saveSelectedTournament: (tournamentId: string | null) => {
    try {
      if (tournamentId) {
        localStorage.setItem('selected-tournament', tournamentId);
      } else {
        localStorage.removeItem('selected-tournament');
      }
    } catch (error) {
      // Error saving selected tournament to localStorage
    }
  },

  getSelectedTournament: (): string | null => {
    try {
      return localStorage.getItem('selected-tournament');
    } catch (error) {
      // Error loading selected tournament from localStorage
      return null;
    }
  },

  clearSelectedTournament: () => {
    localStorage.removeItem('selected-tournament');
  },

  // Seçili weight range
  saveSelectedWeightRange: (weightRangeId: string | null) => {
    try {
      if (weightRangeId) {
        localStorage.setItem('selected-weight-range', weightRangeId);
      } else {
        localStorage.removeItem('selected-weight-range');
      }
    } catch (error) {
      // Error saving selected weight range to localStorage
    }
  },

  getSelectedWeightRange: (): string | null => {
    try {
      return localStorage.getItem('selected-weight-range');
    } catch (error) {
      // Error loading selected weight range from localStorage
      return null;
    }
  },

  clearSelectedWeightRange: () => {
    localStorage.removeItem('selected-weight-range');
  },

  // Player filters
  savePlayerFilters: (filters: PlayerFilters) => {
    try {
      localStorage.setItem('tournament-player-filters', JSON.stringify(filters));
    } catch (error) {
      // Error saving player filters to localStorage
    }
  },

  getPlayerFilters: (): PlayerFilters => {
    try {
      const saved = localStorage.getItem('tournament-player-filters');
      return saved ? JSON.parse(saved) : {
        gender: null,
        handPreference: null,
        weightMin: null,
        weightMax: null,
      };
    } catch (error) {
      // Error loading player filters from localStorage
      return {
        gender: null,
        handPreference: null,
        weightMin: null,
        weightMax: null,
      };
    }
  },

  clearPlayerFilters: () => {
    localStorage.removeItem('tournament-player-filters');
  },

  // Current tournament state (Matches sayfası için)
  saveCurrentTournament: (state: CurrentTournamentState) => {
    try {
      localStorage.setItem('current-tournament', JSON.stringify(state));
    } catch (error) {
      // Error saving current tournament to localStorage
    }
  },

  getCurrentTournament: (): CurrentTournamentState | null => {
    try {
      const saved = localStorage.getItem('current-tournament');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      // Error loading current tournament from localStorage
      return null;
    }
  },

  clearCurrentTournament: () => {
    localStorage.removeItem('current-tournament');
  },

  // Tüm tournament verilerini temizle
  clearAllTournamentData: () => {
    localStorage.removeItem('arm-wrestling-tournaments');
    localStorage.removeItem('selected-tournament');
    localStorage.removeItem('selected-weight-range');
    localStorage.removeItem('tournament-player-filters');
    localStorage.removeItem('current-tournament');
  },

  // Tournament'ı güncelle
  updateTournament: (tournaments: Tournament[], updatedTournament: Tournament): Tournament[] => {
    return tournaments.map(tournament => 
      tournament.id === updatedTournament.id ? updatedTournament : tournament
    );
  },

  // Tournament'ı sil
  deleteTournament: (tournaments: Tournament[], tournamentId: string): Tournament[] => {
    return tournaments.filter(tournament => tournament.id !== tournamentId);
  },

  // Tournament'a weight range ekle
  addWeightRangeToTournament: (tournaments: Tournament[], tournamentId: string, weightRange: WeightRange): Tournament[] => {
    return tournaments.map(tournament => 
      tournament.id === tournamentId 
        ? { ...tournament, weightRanges: [...tournament.weightRanges, weightRange] }
        : tournament
    );
  },

  // Weight range'den player exclude et
  excludePlayerFromWeightRange: (tournaments: Tournament[], tournamentId: string, weightRangeId: string, playerId: string): Tournament[] => {
    return tournaments.map(tournament => 
      tournament.id === tournamentId
        ? {
            ...tournament,
            weightRanges: tournament.weightRanges.map(wr => 
              wr.id === weightRangeId
                ? { ...wr, excludedPlayerIds: [...(wr.excludedPlayerIds || []), playerId] }
                : wr
            )
          }
        : tournament
    );
  },

  // Weight range'den player include et
  includePlayerInWeightRange: (tournaments: Tournament[], tournamentId: string, weightRangeId: string, playerId: string): Tournament[] => {
    return tournaments.map(tournament => 
      tournament.id === tournamentId
        ? {
            ...tournament,
            weightRanges: tournament.weightRanges.map(wr => 
              wr.id === weightRangeId
                ? { ...wr, excludedPlayerIds: (wr.excludedPlayerIds || []).filter(id => id !== playerId) }
                : wr
            )
          }
        : tournament
    );
  }
}; 