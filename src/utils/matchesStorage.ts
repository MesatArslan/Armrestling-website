// Matches localStorage utility
// Bu dosya matches ile ilgili tüm localStorage işlemlerini merkezi olarak yönetir

import { TournamentResultsStorage } from './localStorage';

export interface Fixture {
  id: string;
  name: string; // "1. Lig 1. Fixture", "1. Lig 2. Fixture" gibi
  tournamentId: string;
  tournamentName: string;
  weightRangeId: string;
  weightRangeName: string;
  weightRange: {
    min: number;
    max: number;
  };
  players: Player[];
  playerCount: number;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  lastUpdated: string;
  completedAt?: string;
  results: MatchResult[];
  rankings?: {
    first?: string;
    second?: string;
    third?: string;
  };
  tournamentComplete: boolean;
  playerWins: {[playerId: string]: number};
  matches: Match[];
  activeTab?: 'active' | 'completed' | 'rankings'; // Track which tab is active for this fixture
}

export interface Player {
  id: string;
  name: string;
  surname: string;
  weight: number;
  gender: 'male' | 'female';
  handPreference: 'left' | 'right' | 'both';
  birthday?: string;
  city?: string;
}

export interface Match {
  id: string;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  bracket: 'winner' | 'loser';
  round: number;
  matchNumber: number;
  isBye: boolean;
  isCompleted: boolean;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  loserId?: string;
  timestamp: string;
  type: string;
}

export interface MatchesData {
  fixtures: Fixture[];
  activeFixtureId?: string;
  lastUpdated: string;
}

export const MatchesStorage = {
  // Ana matches verisi
  saveMatchesData: (data: MatchesData) => {
    try {
      localStorage.setItem('arm-wrestling-matches', JSON.stringify(data));
    } catch (error) {
      // Error saving matches data to localStorage
    }
  },

  getMatchesData: (): MatchesData => {
    try {
      const saved = localStorage.getItem('arm-wrestling-matches');
      const result = saved ? JSON.parse(saved) : { fixtures: [], lastUpdated: new Date().toISOString() };
      return result;
    } catch (error) {
      // Error loading matches data from localStorage
      return { fixtures: [], lastUpdated: new Date().toISOString() };
    }
  },

  // Fixture ekle
  addFixture: (fixture: Fixture) => {
    const data = MatchesStorage.getMatchesData();
    data.fixtures.push(fixture);
    data.lastUpdated = new Date().toISOString();
    MatchesStorage.saveMatchesData(data);
  },

  // Fixture güncelle
  updateFixture: (fixtureId: string, updatedFixture: Partial<Fixture>) => {
    const data = MatchesStorage.getMatchesData();
    const index = data.fixtures.findIndex(f => f.id === fixtureId);
    if (index !== -1) {
      data.fixtures[index] = { ...data.fixtures[index], ...updatedFixture, lastUpdated: new Date().toISOString() };
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture sil
  deleteFixture: (fixtureId: string) => {
    const data = MatchesStorage.getMatchesData();
    const fixtureToDelete = data.fixtures.find(f => f.id === fixtureId);
    
    data.fixtures = data.fixtures.filter(f => f.id !== fixtureId);
    data.lastUpdated = new Date().toISOString();
    MatchesStorage.saveMatchesData(data);
    
    // Clear double elimination tournament state for this fixture
    try {
      // Clear all possible double elimination states for this fixture
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(`double-elimination-fixture-${fixtureId}`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      // Error clearing double elimination state
    }
    
    // Clear tournament results if fixture exists
    if (fixtureToDelete) {
      try {
        TournamentResultsStorage.clearTournamentResults(fixtureToDelete.tournamentId, fixtureToDelete.weightRangeId);
      } catch (error) {
        // Error clearing tournament results
      }
    }
  },

  // Aktif fixture'ı ayarla
  setActiveFixture: (fixtureId: string | null) => {
    const data = MatchesStorage.getMatchesData();
    data.activeFixtureId = fixtureId || undefined;
    data.lastUpdated = new Date().toISOString();
    MatchesStorage.saveMatchesData(data);
  },

  // Aktif fixture'ı al
  getActiveFixture: (): Fixture | null => {
    const data = MatchesStorage.getMatchesData();
    if (data.activeFixtureId) {
      return data.fixtures.find(f => f.id === data.activeFixtureId) || null;
    }
    return null;
  },

  // Tüm fixture'ları al
  getAllFixtures: (): Fixture[] => {
    const data = MatchesStorage.getMatchesData();
    return data.fixtures;
  },

  // Fixture'ı ID ile al
  getFixtureById: (fixtureId: string): Fixture | null => {
    const data = MatchesStorage.getMatchesData();
    return data.fixtures.find(f => f.id === fixtureId) || null;
  },

  // Maç sonucu ekle
  addMatchResult: (fixtureId: string, result: MatchResult) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.results.push(result);
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Turnuva durumunu güncelle
  updateTournamentState: (fixtureId: string, state: {
    matches?: Match[];
    rankings?: { first?: string; second?: string; third?: string };
    tournamentComplete?: boolean;
    playerWins?: {[playerId: string]: number};
  }) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      if (state.matches) fixture.matches = state.matches;
      if (state.rankings) fixture.rankings = state.rankings;
      if (state.tournamentComplete !== undefined) fixture.tournamentComplete = state.tournamentComplete;
      if (state.playerWins) fixture.playerWins = state.playerWins;
      
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Rankings'i kaydet
  saveRankings: (fixtureId: string, rankings: { first?: string; second?: string; third?: string }) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.rankings = rankings;
      fixture.status = 'completed';
      fixture.completedAt = new Date().toISOString();
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture'ın aktif tab'ını güncelle
  updateFixtureActiveTab: (fixtureId: string, activeTab: 'active' | 'completed' | 'rankings') => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.activeTab = activeTab;
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture'ın aktif tab'ını al
  getFixtureActiveTab: (fixtureId: string): 'active' | 'completed' | 'rankings' => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    return fixture?.activeTab || 'active';
  },

  // Fixture'ı rankings ile tamamla
  completeFixtureWithRankings: (fixtureId: string, rankings: { first?: string; second?: string; third?: string }) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.status = 'completed';
      fixture.rankings = rankings;
      fixture.completedAt = new Date().toISOString();
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture'ı tamamla
  completeFixture: (fixtureId: string) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.status = 'completed';
      fixture.completedAt = new Date().toISOString();
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture'ı duraklat
  pauseFixture: (fixtureId: string) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.status = 'paused';
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture'ı aktif et
  activateFixture: (fixtureId: string) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      fixture.status = 'active';
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Tüm matches verilerini temizle
  clearAllMatchesData: () => {
    localStorage.removeItem('arm-wrestling-matches');
  },

  // Test fixture'ı oluştur
  createTestFixture: (): Fixture => {
    return {
      id: 'test-fixture-1',
      name: 'Test Tournament - 70-80 kg',
      tournamentId: 'test-tournament-1',
      tournamentName: 'Test Tournament',
      weightRangeId: 'test-weight-1',
      weightRangeName: '70-80 kg',
      weightRange: { min: 70, max: 80 },
      players: [],
      playerCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      results: [],
      tournamentComplete: false,
      playerWins: {},
      matches: [],
      activeTab: 'active'
    };
  },

  // Fixture adı oluştur (Tournament ismi + weight range)
  generateFixtureName: (tournamentName: string, weightRangeName: string): string => {
    return `${tournamentName} - ${weightRangeName}`;
  },

  // Yeni fixture oluştur
  createNewFixture: (tournament: any, weightRange: any, players: Player[]): Fixture => {
    const existingFixtures = MatchesStorage.getAllFixtures();
    const tournamentFixtures = existingFixtures.filter(f => f.tournamentId === tournament.id);
    const fixtureNumber = tournamentFixtures.length + 1;
    const weightRangeName = weightRange.name || `${weightRange.min}-${weightRange.max} kg`;
    
    return {
      id: `${tournament.id}-${weightRange.id}-${fixtureNumber}`,
      name: MatchesStorage.generateFixtureName(tournament.name, weightRangeName),
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      weightRangeId: weightRange.id,
      weightRangeName: weightRangeName,
      weightRange: { min: weightRange.min, max: weightRange.max },
      players: players,
      playerCount: players.length,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      results: [],
      tournamentComplete: false,
      playerWins: {},
      matches: [],
      activeTab: 'active'
    };
  }
}; 