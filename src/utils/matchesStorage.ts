// Matches localStorage utility
// Bu dosya matches ile ilgili tüm localStorage işlemlerini merkezi olarak yönetir

import { TournamentResultsStorage } from './localStorage';
import MatchesRepo, { type MatchPlayStatus as RepoMatchStatus } from '../storage/MatchesRepository';

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

export type MatchPlayStatus = 'waiting' | 'active' | 'completed';

export const MatchesStorage = {
  // Ana matches verisi
  saveMatchesData: (data: MatchesData) => {
    try {
      // Yeni sistem: per-fixture kayıt ve active id
      const repo = new MatchesRepo();
      const index = data.fixtures.map(f => f.id);
      repo.setIndex(index);
      repo.setActiveFixtureId(data.activeFixtureId || null);
      data.fixtures.forEach(f => repo.upsertFixture(f as any));
      // Legacy anahtara yazmayı durdurduk
    } catch (error) {
      // Error saving matches data to localStorage
    }
  },

  getMatchesData: (): MatchesData => {
    try {
      const repo = new MatchesRepo();
      const ids = repo.getIndex();
      const fixtures = ids.map(id => repo.getFixture(id)).filter(Boolean) as Fixture[];
      const activeFixtureId = repo.getActiveFixtureId() || undefined;
      if (fixtures.length > 0) {
        const lastUpdated = fixtures.reduce((acc, f) => (acc > f.lastUpdated ? acc : f.lastUpdated), fixtures[0].lastUpdated);
        return { fixtures, activeFixtureId, lastUpdated };
      }
      // Legacy fallback + migrate forward
      const saved = localStorage.getItem('arm-wrestling-matches');
      const legacy: MatchesData = saved ? JSON.parse(saved) : { fixtures: [], lastUpdated: new Date().toISOString() };
      if (legacy.fixtures.length > 0) {
        try {
          repo.setIndex(legacy.fixtures.map(f => f.id));
          repo.setActiveFixtureId(legacy.activeFixtureId || null);
          legacy.fixtures.forEach(f => repo.upsertFixture(f as any));
        } catch {}
      }
      return legacy;
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
    // Yeni sistem
    try {
      const repo = new MatchesRepo();
      repo.upsertFixture(fixture as any);
      repo.setIndex(data.fixtures.map(f => f.id));
    } catch {}
    MatchesStorage.saveMatchesData(data);
  },

  // Fixture güncelle
  updateFixture: (fixtureId: string, updatedFixture: Partial<Fixture>) => {
    const data = MatchesStorage.getMatchesData();
    const index = data.fixtures.findIndex(f => f.id === fixtureId);
    if (index !== -1) {
      const merged = { ...data.fixtures[index], ...updatedFixture, lastUpdated: new Date().toISOString() } as Fixture;
      data.fixtures[index] = merged;
      data.lastUpdated = new Date().toISOString();
      try { new MatchesRepo().upsertFixture(merged as any); } catch {}
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture sil
  deleteFixture: (fixtureId: string) => {
    const data = MatchesStorage.getMatchesData();
    const fixtureToDelete = data.fixtures.find(f => f.id === fixtureId);
    data.fixtures = data.fixtures.filter(f => f.id !== fixtureId);
    data.lastUpdated = new Date().toISOString();
    try {
      const repo = new MatchesRepo();
      repo.removeFixture(fixtureId);
      repo.setIndex(data.fixtures.map(f => f.id));
      // Clear per-fixture statuses in the new repository
      try { repo.setStatuses(fixtureId, {} as Record<string, RepoMatchStatus>); } catch {}
      if (data.activeFixtureId === fixtureId) repo.setActiveFixtureId(null);
    } catch {}
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

    // Clear legacy per-match statuses map entries for this fixture
    try {
      const raw = localStorage.getItem('arm-wrestling-match-statuses');
      if (raw) {
        const map = JSON.parse(raw) as Record<string, MatchPlayStatus>;
        let changed = false;
        Object.keys(map).forEach((k) => {
          if (k.startsWith(`${fixtureId}::`)) {
            delete map[k];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem('arm-wrestling-match-statuses', JSON.stringify(map));
        }
      }
    } catch {}
    
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
    try { new MatchesRepo().setActiveFixtureId(fixtureId); } catch {}
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
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Turnuva durumunu güncelle
  updateTournamentState: (fixtureId: string, state: {
    rankings?: { first?: string; second?: string; third?: string };
    tournamentComplete?: boolean;
    playerWins?: {[playerId: string]: number};
  }) => {
    const data = MatchesStorage.getMatchesData();
    const fixture = data.fixtures.find(f => f.id === fixtureId);
    if (fixture) {
      if (state.rankings) fixture.rankings = state.rankings;
      if (state.tournamentComplete !== undefined) fixture.tournamentComplete = state.tournamentComplete;
      if (state.playerWins) fixture.playerWins = state.playerWins;
      fixture.lastUpdated = new Date().toISOString();
      data.lastUpdated = new Date().toISOString();
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
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
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
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
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Fixture'ın aktif tab'ını al
  getFixtureActiveTab: (fixtureId: string): 'active' | 'completed' | 'rankings' => {
    try {
      const fixture = new MatchesRepo().getFixture(fixtureId) as any;
      if (fixture && fixture.activeTab) return fixture.activeTab;
    } catch {}
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
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
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
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
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
      try { new MatchesRepo().upsertFixture(fixture as any); } catch {}
      MatchesStorage.saveMatchesData(data);
    }
  },

  // Tüm matches verilerini temizle
  clearAllMatchesData: () => {
    try {
      const repo = new MatchesRepo();
      const ids = repo.getIndex();
      ids.forEach(id => {
        try { repo.removeFixture(id); } catch {}
      });
      repo.setIndex([]);
      repo.setActiveFixtureId(null);
    } catch {}
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
      activeTab: 'active'
    };
  }
  ,
  // --- Per-match play status persistence ---
  getAllMatchStatuses: (): Record<string, MatchPlayStatus> => {
    // Not used in new per-fixture model; keep legacy for compatibility
    try {
      const raw = localStorage.getItem('arm-wrestling-match-statuses');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
  getMatchStatus: (fixtureId: string, matchId: string): MatchPlayStatus => {
    try {
      const repo = new MatchesRepo();
      const map = repo.getStatuses(fixtureId) as Record<string, RepoMatchStatus>;
      return (map[matchId] as MatchPlayStatus) || 'waiting';
    } catch {
      const map = MatchesStorage.getAllMatchStatuses();
      const key = `${fixtureId}::${matchId}`;
      return map[key] || 'waiting';
    }
  },
  setMatchStatus: (fixtureId: string, matchId: string, status: MatchPlayStatus) => {
    try {
      const repo = new MatchesRepo();
      repo.setStatus(fixtureId, matchId, status as RepoMatchStatus);
    } catch {}
    // legacy path
    const map = MatchesStorage.getAllMatchStatuses();
    const key = `${fixtureId}::${matchId}`;
    map[key] = status;
    try { localStorage.setItem('arm-wrestling-match-statuses', JSON.stringify(map)); } catch {}
  },
  clearMatchStatus: (fixtureId: string, matchId: string) => {
    try { new MatchesRepo().clearStatus(fixtureId, matchId); } catch {}
    const map = MatchesStorage.getAllMatchStatuses();
    const key = `${fixtureId}::${matchId}`;
    if (key in map) {
      delete map[key];
      try { localStorage.setItem('arm-wrestling-match-statuses', JSON.stringify(map)); } catch {}
    }
  }
}; 