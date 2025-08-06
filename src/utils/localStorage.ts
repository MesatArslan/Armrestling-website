// LocalStorage utility functions for managing all application data

// Storage keys
export const STORAGE_KEYS = {
  PLAYERS: 'arm-wrestling-players',
  TOURNAMENTS: 'arm-wrestling-tournaments',
  ACTIVE_FIXTURES: 'arm-wrestling-active-fixtures',
  CURRENT_TOURNAMENT: 'current-tournament',
  TOURNAMENT_RESULTS: 'tournament-results',
  DOUBLE_ELIMINATION: 'double-elimination',
} as const;

// Player management
export const PlayerStorage = {
  // Get all players
  getPlayers: (): any[] => {
    try {
      const players = localStorage.getItem(STORAGE_KEYS.PLAYERS);
      return players ? JSON.parse(players) : [];
    } catch (error) {
      // Error loading players
      return [];
    }
  },

  // Save all players
  savePlayers: (players: any[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    } catch (error) {
      // Error saving players
    }
  },

  // Add a single player
  addPlayer: (player: any): void => {
    const players = PlayerStorage.getPlayers();
    players.push(player);
    PlayerStorage.savePlayers(players);
  },

  // Update a player
  updatePlayer: (playerId: string, updatedPlayer: any): void => {
    const players = PlayerStorage.getPlayers();
    const index = players.findIndex(p => p.id === playerId);
    if (index !== -1) {
      players[index] = { ...players[index], ...updatedPlayer };
      PlayerStorage.savePlayers(players);
    }
  },

  // Delete a player
  deletePlayer: (playerId: string): void => {
    const players = PlayerStorage.getPlayers();
    const filteredPlayers = players.filter(p => p.id !== playerId);
    PlayerStorage.savePlayers(filteredPlayers);
  },

  // Clear all players
  clearPlayers: (): void => {
    localStorage.removeItem(STORAGE_KEYS.PLAYERS);
  }
};

// Tournament management
export const TournamentStorage = {
  // Get all tournaments
  getTournaments: (): any[] => {
    try {
      const tournaments = localStorage.getItem(STORAGE_KEYS.TOURNAMENTS);
      return tournaments ? JSON.parse(tournaments) : [];
    } catch (error) {
      // Error loading tournaments
      return [];
    }
  },

  // Save all tournaments
  saveTournaments: (tournaments: any[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.TOURNAMENTS, JSON.stringify(tournaments));
    } catch (error) {
      // Error saving tournaments
    }
  },

  // Add a tournament
  addTournament: (tournament: any): void => {
    const tournaments = TournamentStorage.getTournaments();
    tournaments.push(tournament);
    TournamentStorage.saveTournaments(tournaments);
  },

  // Update a tournament
  updateTournament: (tournamentId: string, updatedTournament: any): void => {
    const tournaments = TournamentStorage.getTournaments();
    const index = tournaments.findIndex(t => t.id === tournamentId);
    if (index !== -1) {
      tournaments[index] = { ...tournaments[index], ...updatedTournament };
      TournamentStorage.saveTournaments(tournaments);
    }
  },

  // Delete a tournament
  deleteTournament: (tournamentId: string): void => {
    const tournaments = TournamentStorage.getTournaments();
    const filteredTournaments = tournaments.filter(t => t.id !== tournamentId);
    TournamentStorage.saveTournaments(filteredTournaments);
  },

  // Clear all tournaments
  clearTournaments: (): void => {
    localStorage.removeItem(STORAGE_KEYS.TOURNAMENTS);
  }
};

// Active fixtures management - DEPRECATED: Use MatchesStorage instead
export const ActiveFixturesStorage = {
  // Get active fixtures
  getActiveFixtures: (): any[] => {
    try {
      const fixtures = localStorage.getItem(STORAGE_KEYS.ACTIVE_FIXTURES);
      return fixtures ? JSON.parse(fixtures) : [];
    } catch (error) {
      // Error loading active fixtures
      return [];
    }
  },

  // Save active fixtures
  saveActiveFixtures: (fixtures: any[]): void => {
    try {
      if (fixtures.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_FIXTURES, JSON.stringify(fixtures));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_FIXTURES);
      }
    } catch (error) {
      // Error saving active fixtures
    }
  },

  // Add or update a fixture
  addOrUpdateFixture: (fixture: any): void => {
    const fixtures = ActiveFixturesStorage.getActiveFixtures();
    const existingIndex = fixtures.findIndex(f => f.id === fixture.id);
    
    if (existingIndex !== -1) {
      fixtures[existingIndex] = { ...fixtures[existingIndex], ...fixture };
    } else {
      fixtures.push(fixture);
    }
    
    ActiveFixturesStorage.saveActiveFixtures(fixtures);
  },

  // Remove a fixture
  removeFixture: (fixtureId: string): void => {
    const fixtures = ActiveFixturesStorage.getActiveFixtures();
    const filteredFixtures = fixtures.filter(f => f.id !== fixtureId);
    ActiveFixturesStorage.saveActiveFixtures(filteredFixtures);
  },

  // Clear all active fixtures
  clearActiveFixtures: (): void => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_FIXTURES);
  }
};

// Current tournament state management
export const CurrentTournamentStorage = {
  // Get current tournament state
  getCurrentTournament: (): any => {
    try {
      const currentTournament = localStorage.getItem(STORAGE_KEYS.CURRENT_TOURNAMENT);
      return currentTournament ? JSON.parse(currentTournament) : null;
    } catch (error) {
      // Error loading current tournament
      return null;
    }
  },

  // Save current tournament state
  saveCurrentTournament: (tournamentState: any): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TOURNAMENT, JSON.stringify(tournamentState));
    } catch (error) {
      // Error saving current tournament
    }
  },

  // Clear current tournament state
  clearCurrentTournament: (): void => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TOURNAMENT);
  }
};

// Tournament results management
export const TournamentResultsStorage = {
  // Get tournament results
  getTournamentResults: (tournamentId: string, weightRangeId: string): any[] => {
    try {
      const key = `${STORAGE_KEYS.TOURNAMENT_RESULTS}-${tournamentId}-${weightRangeId}`;
      const results = localStorage.getItem(key);
      return results ? JSON.parse(results) : [];
    } catch (error) {
      // Error loading tournament results
      return [];
    }
  },

  // Save tournament results
  saveTournamentResults: (tournamentId: string, weightRangeId: string, results: any[]): void => {
    try {
      const key = `${STORAGE_KEYS.TOURNAMENT_RESULTS}-${tournamentId}-${weightRangeId}`;
      localStorage.setItem(key, JSON.stringify(results));
    } catch (error) {
      // Error saving tournament results
    }
  },

  // Add tournament result
  addTournamentResult: (tournamentId: string, weightRangeId: string, result: any): void => {
    const results = TournamentResultsStorage.getTournamentResults(tournamentId, weightRangeId);
    results.push(result);
    TournamentResultsStorage.saveTournamentResults(tournamentId, weightRangeId, results);
  },

  // Clear tournament results
  clearTournamentResults: (tournamentId: string, weightRangeId: string): void => {
    const key = `${STORAGE_KEYS.TOURNAMENT_RESULTS}-${tournamentId}-${weightRangeId}`;
    localStorage.removeItem(key);
  }
};

// Double elimination tournament state management
export const DoubleEliminationStorage = {
  // Get double elimination state
  getDoubleEliminationState: (playerCount: number, playerIds: string, fixtureId?: string): any => {
    try {
      // Use fixture ID if provided, otherwise fall back to old format for backward compatibility
      const key = fixtureId 
        ? `${STORAGE_KEYS.DOUBLE_ELIMINATION}-fixture-${fixtureId}` 
        : `${STORAGE_KEYS.DOUBLE_ELIMINATION}-${playerCount}-${playerIds}`;
      const state = localStorage.getItem(key);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      // Error loading double elimination state
      return null;
    }
  },

  // Save double elimination state
  saveDoubleEliminationState: (playerCount: number, playerIds: string, state: any, fixtureId?: string): void => {
    try {
      // Use fixture ID if provided, otherwise fall back to old format for backward compatibility
      const key = fixtureId 
        ? `${STORAGE_KEYS.DOUBLE_ELIMINATION}-fixture-${fixtureId}` 
        : `${STORAGE_KEYS.DOUBLE_ELIMINATION}-${playerCount}-${playerIds}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      // Error saving double elimination state
    }
  },

  // Clear double elimination state
  clearDoubleEliminationState: (playerCount: number, playerIds: string, fixtureId?: string): void => {
    // Use fixture ID if provided, otherwise fall back to old format for backward compatibility
    const key = fixtureId 
      ? `${STORAGE_KEYS.DOUBLE_ELIMINATION}-fixture-${fixtureId}` 
      : `${STORAGE_KEYS.DOUBLE_ELIMINATION}-${playerCount}-${playerIds}`;
    localStorage.removeItem(key);
  },

  // Clear all double elimination states for a specific player combination
  clearAllDoubleEliminationStates: (playerIds: string): void => {
    const keys = Object.keys(localStorage);
    const pattern = new RegExp(`^${STORAGE_KEYS.DOUBLE_ELIMINATION}-\\d+-${playerIds.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    
    keys.forEach(key => {
      if (pattern.test(key)) {
        localStorage.removeItem(key);
      }
    });
  }
};

// General storage utilities
export const StorageUtils = {
  // Clear all application data
  clearAllData: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Also clear any tournament results and double elimination states
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEYS.TOURNAMENT_RESULTS) || 
          key.startsWith(STORAGE_KEYS.DOUBLE_ELIMINATION)) {
        localStorage.removeItem(key);
      }
    });
  },

  // Export all data
  exportData: (): any => {
    const data: any = {};
    
    // Export all storage keys
    Object.entries(STORAGE_KEYS).forEach(([, value]) => {
      const item = localStorage.getItem(value);
      if (item) {
        data[value] = JSON.parse(item);
      }
    });
    
    // Export tournament results
    const keys = Object.keys(localStorage);
    const tournamentResults: any = {};
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEYS.TOURNAMENT_RESULTS)) {
        tournamentResults[key] = JSON.parse(localStorage.getItem(key) || '[]');
      }
    });
    data.tournamentResults = tournamentResults;
    
    // Export double elimination states
    const doubleEliminationStates: any = {};
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEYS.DOUBLE_ELIMINATION)) {
        doubleEliminationStates[key] = JSON.parse(localStorage.getItem(key) || 'null');
      }
    });
    data.doubleEliminationStates = doubleEliminationStates;
    
    return data;
  },

  // Import data
  importData: (data: any): void => {
    try {
      // Clear existing data
      StorageUtils.clearAllData();
      
      // Import all storage keys
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'tournamentResults' && key !== 'doubleEliminationStates') {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
      
      // Import tournament results
      if (data.tournamentResults) {
        Object.entries(data.tournamentResults).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      }
      
      // Import double elimination states
      if (data.doubleEliminationStates) {
        Object.entries(data.doubleEliminationStates).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      }
    } catch (error) {
      // Error importing data
      throw error;
    }
  },

  // Get storage size info
  getStorageInfo: (): any => {
    const info: any = {};
    let totalSize = 0;
    
    Object.entries(STORAGE_KEYS).forEach(([, value]) => {
      const item = localStorage.getItem(value);
      if (item) {
        const size = new Blob([item]).size;
        info[value] = {
          size: size,
          sizeKB: (size / 1024).toFixed(2)
        };
        totalSize += size;
      }
    });
    
    info.totalSize = totalSize;
    info.totalSizeKB = (totalSize / 1024).toFixed(2);
    
    return info;
  }
};

export default {
  STORAGE_KEYS,
  PlayerStorage,
  TournamentStorage,
  ActiveFixturesStorage,
  CurrentTournamentStorage,
  TournamentResultsStorage,
  DoubleEliminationStorage,
  StorageUtils
}; 