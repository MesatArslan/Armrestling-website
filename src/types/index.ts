// Ortak kullanılan type tanımları
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

// Turnuva ile ilgili tipler
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
  date: string;
  players: Player[];
  type: 'single' | 'double';
  weightRanges?: WeightRange[];
  isExpanded?: boolean;
  genderFilter?: 'male' | 'female' | null;
  handPreferenceFilter?: 'left' | 'right' | null;
  birthYearMin?: number | null;
  birthYearMax?: number | null;
}

// Maç ile ilgili tipler
export interface Match {
  id: string;
  player1?: Player;
  player2?: Player;
  winner?: Player;
  round: number;
  bracket: 'winner' | 'loser';
}

// Filtre tipleri
export interface PlayerFilters {
  gender: 'all' | 'male' | 'female';
  handPreference: 'all' | 'left' | 'right' | 'both';
  weightRange: {
    min: number;
    max: number;
  };
}

// Editlenmekte olan hücre tipi
export interface EditingCell {
  id: string;
  column: string;
}

// Sütun tanımları
export interface Column {
  id: string;
  label: string;
  sortable: boolean;
  editable: boolean;
}

// Double elimination component props
export interface DoubleEliminationProps {
  players: Player[];
  onMatchResult: (type: string, winnerId: string, loserId?: string) => void;
  onTournamentComplete?: (rankings: { first?: string; second?: string; third?: string; fourth?: string }) => void;
  initialTab?: 'active' | 'completed' | 'rankings';
  fixtureId?: string;
}

// Active Fixture interface
export interface ActiveFixture {
  id: string;
  name: string;
  tournamentName: string;
  weightRange: string;
  playerCount: number;
  isActive: boolean;
  lastUpdated: string;
  tournament: Tournament;
  weightRangeObj: WeightRange;
  players: Player[];
} 