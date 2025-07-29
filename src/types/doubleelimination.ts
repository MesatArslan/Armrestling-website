// Double elimination component'leri için ortak interface'ler

export interface Match {
  timestamp?: number;
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId?: string;
  bracket: 'winner' | 'loser' | 'placement';
  round: number;
  matchNumber: number;
  isBye: boolean;
  description?: string;
  tablePosition?: { [playerId: string]: 'left' | 'right' };
}

export interface Ranking {
  first?: string;
  second?: string;
  third?: string;
  fourth?: string;
  fifth?: string;
  sixth?: string;
  seventh?: string;
  eighth?: string;
} 