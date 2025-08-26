// Round description utility for double elimination tournaments
// Bu dosya tüm double elimination bileşenlerinde kullanılan round description'ları standartlaştırır

export interface RoundDescription {
  key: string;
  displayName: string;
  shortName: string;
  description: string;
}

export const ROUND_DESCRIPTIONS: { [key: string]: RoundDescription } = {
  // Winner Bracket Rounds
  'WB1': {
    key: 'WB1',
    displayName: 'Winner Bracket Round 1',
    shortName: 'WB R1',
    description: 'Winner Bracket Round 1'
  },
  'WB2': {
    key: 'WB2',
    displayName: 'Winner Bracket Round 2',
    shortName: 'WB R2',
    description: 'Winner Bracket Round 2'
  },
  'WB3': {
    key: 'WB3',
    displayName: 'Winner Bracket Round 3',
    shortName: 'WB R3',
    description: 'Winner Bracket Round 3'
  },
  'WB4': {
    key: 'WB4',
    displayName: 'Winner Bracket Round 4',
    shortName: 'WB R4',
    description: 'Winner Bracket Round 4'
  },
  'WB5': {
    key: 'WB5',
    displayName: 'Winner Bracket Round 5',
    shortName: 'WB R5',
    description: 'Winner Bracket Round 5'
  },
  'WB6': {
    key: 'WB6',
    displayName: 'Winner Bracket Round 6',
    shortName: 'WB R6',
    description: 'Winner Bracket Round 6'
  },
  'WB7': {
    key: 'WB7',
    displayName: 'Winner Bracket Round 7',
    shortName: 'WB R7',
    description: 'Winner Bracket Round 7'
  },
  'WB8': {
    key: 'WB8',
    displayName: 'Winner Bracket Round 8',
    shortName: 'WB R8',
    description: 'Winner Bracket Round 8'
  },

  // Special Winner Bracket Rounds
  'WB_QuarterFinal': {
    key: 'WB_QuarterFinal',
    displayName: 'Winner Bracket Quarter Final',
    shortName: 'WB QF',
    description: 'Winner Bracket Quarter Final'
  },
  'WB_SemiFinal': {
    key: 'WB_SemiFinal',
    displayName: 'Winner Bracket Semi Final',
    shortName: 'WB SF',
    description: 'Winner Bracket Semi Final'
  },

  // Loser Bracket Rounds
  'LB1': {
    key: 'LB1',
    displayName: 'Loser Bracket Round 1',
    shortName: 'LB R1',
    description: 'Loser Bracket Round 1'
  },
  'LB2': {
    key: 'LB2',
    displayName: 'Loser Bracket Round 2',
    shortName: 'LB R2',
    description: 'Loser Bracket Round 2'
  },
  'LB3': {
    key: 'LB3',
    displayName: 'Loser Bracket Round 3',
    shortName: 'LB R3',
    description: 'Loser Bracket Round 3'
  },
  'LB4': {
    key: 'LB4',
    displayName: 'Loser Bracket Round 4',
    shortName: 'LB R4',
    description: 'Loser Bracket Round 4'
  },
  'LB5': {
    key: 'LB5',
    displayName: 'Loser Bracket Round 5',
    shortName: 'LB R5',
    description: 'Loser Bracket Round 5'
  },
  'LB6': {
    key: 'LB6',
    displayName: 'Loser Bracket Round 6',
    shortName: 'LB R6',
    description: 'Loser Bracket Round 6'
  },
  'LB7': {
    key: 'LB7',
    displayName: 'Loser Bracket Round 7',
    shortName: 'LB R7',
    description: 'Loser Bracket Round 7'
  },
  'LB8': {
    key: 'LB8',
    displayName: 'Loser Bracket Round 8',
    shortName: 'LB R8',
    description: 'Loser Bracket Round 8'
  },
  'LB9': {
    key: 'LB9',
    displayName: 'Loser Bracket Round 9',
    shortName: 'LB R9',
    description: 'Loser Bracket Round 9'
  },
  'LB10': {
    key: 'LB10',
    displayName: 'Loser Bracket Round 10',
    shortName: 'LB R10',
    description: 'Loser Bracket Round 10'
  },
  'LB11': {
    key: 'LB11',
    displayName: 'Loser Bracket Round 11',
    shortName: 'LB R11',
    description: 'Loser Bracket Round 11'
  },
  'LB12': {
    key: 'LB12',
    displayName: 'Loser Bracket Round 12',
    shortName: 'LB R12',
    description: 'Loser Bracket Round 12'
  },
  'LB13': {
    key: 'LB13',
    displayName: 'Loser Bracket Round 13',
    shortName: 'LB R13',
    description: 'Loser Bracket Round 13'
  },
  'LB14': {
    key: 'LB14',
    displayName: 'Loser Bracket Round 14',
    shortName: 'LB R14',
    description: 'Loser Bracket Round 14'
  },
  'LB15': {
    key: 'LB15',
    displayName: 'Loser Bracket Round 15',
    shortName: 'LB R15',
    description: 'Loser Bracket Round 15'
  },

  // Special Loser Bracket Rounds
  'LB_Final': {
    key: 'LB_Final',
    displayName: 'Loser Bracket Final',
    shortName: 'LB Final',
    description: 'Loser Bracket Final'
  },

  // Placement Matches
  '7-8': {
    key: '7-8',
    displayName: '7th/8th Place Match',
    shortName: '7th Place',
    description: '7th/8th Place Match'
  },
  '5-6': {
    key: '5-6',
    displayName: '5th/6th Place Match',
    shortName: '5th Place',
    description: '5th/6th Place Match'
  },
  '4-5': {
    key: '4-5',
    displayName: '4th/5th Place Match',
    shortName: '4th Place',
    description: '4th/5th Place Match'
  },
  '3-4': {
    key: '3-4',
    displayName: '3rd/4th Place Match',
    shortName: '3rd Place',
    description: '3rd/4th Place Match'
  },

  // Finals
  'Final': {
    key: 'Final',
    displayName: 'Final',
    shortName: 'WB Final',
    description: 'Final'
  },
  'GrandFinal': {
    key: 'GrandFinal',
    displayName: 'Grand Final',
    shortName: 'Grand Final',
    description: 'Grand Final'
  }
  
};

export const RoundDescriptionUtils = {
  // Get round description by key
  getRoundDescription: (key: string): RoundDescription => {
    return ROUND_DESCRIPTIONS[key] || {
      key,
      displayName: key,
      shortName: key,
      description: key
    };
  },

  // Get display name for a round
  getDisplayName: (key: string): string => {
    return RoundDescriptionUtils.getRoundDescription(key).displayName;
  },

  // Get short name for a round
  getShortName: (key: string): string => {
    return RoundDescriptionUtils.getRoundDescription(key).shortName;
  },

  // Get full description for a round
  getDescription: (key: string): string => {
    return RoundDescriptionUtils.getRoundDescription(key).description;
  },

  // Create match description with match number
  createMatchDescription: (roundKey: string, matchNumber?: number): string => {
    const roundDesc = RoundDescriptionUtils.getDescription(roundKey);
    if (matchNumber) {
      return `${roundDesc} - Match ${matchNumber}`;
    }
    return roundDesc;
  },

  // Get all available round keys
  getAllRoundKeys: (): string[] => {
    return Object.keys(ROUND_DESCRIPTIONS);
  },

  // Check if a round key is valid
  isValidRoundKey: (key: string): boolean => {
    return key in ROUND_DESCRIPTIONS;
  },

  // Calculate total matches for double elimination tournament
  calculateTotalMatches: (playerCount: number): number => {
    if (playerCount <= 0) return 0;
    if (playerCount === 1) return 0; // Single player, no matches needed
    
    // For 2-7 players, use predefined counts
    if (playerCount <= 7) {
      const matchCounts = {
        2: 2,   // 2 players: 2 matches (semifinal + final), Grand Final adds +1 if played
        3: 4,   // 3 players: 4 matches (WB1, WB2, LB1, Final), Grand Final adds +1 if played
        4: 6,   // 4 players: 6 matches (WB1, WB2, LB1, LB2, Final), Grand Final adds +1 if played
        5: 9,   // 5 players: 9 matches (WB1, WB2, LB1, LB2, LB3, Final), Grand Final adds +1 if played
        6: 11,  // 6 players: 11 matches (WB1, WB2, WB3, LB1, LB2, LB3, LB4, LB5, Final), Grand Final adds +1 if played
        7: 13   // 7 players: 13 matches (WB1, WB2, WB3, LB1, LB2, LB3, LB4, LB5, LB6, Final), Grand Final adds +1 if played
      };
      return matchCounts[playerCount as keyof typeof matchCounts];
    }
    
    // For 8+ players, use the formula:
    // (playerCount - 1) * 2 + 2 placement matches
    // Grand final is NOT included in base calculation - it's added separately when played
    const eliminationMatches = (playerCount - 1) * 2;
    const placementMatches = 2; // 7th/8th and 5th/6th place matches
    
    return eliminationMatches + placementMatches;
  },

  // Check if grand final match exists in current matches
  hasGrandFinalMatch: (matches: any[]): boolean => {
    return matches.some(match => 
      match.id?.toLowerCase().includes('grandfinal') || 
      match.description?.toLowerCase().includes('grand final') ||
      match.round === 'GrandFinal'
    );
  },

  // Calculate total matches including grand final (when it's actually played)
  calculateTotalMatchesWithGrandFinal: (playerCount: number, hasGrandFinal: boolean = false): number => {
    const baseMatches = RoundDescriptionUtils.calculateTotalMatches(playerCount);
    return hasGrandFinal ? baseMatches + 1 : baseMatches;
  },

  // Check if grand final will be played based on tournament structure
  willGrandFinalBePlayed: (playerCount: number): boolean => {
    if (playerCount === 1) return false; // Single player, no matches needed
    
    // For 2-7 players, grand final is possible if both players win one match each
    if (playerCount === 2 || playerCount === 3 || playerCount === 4 || playerCount === 5 || playerCount === 6 || playerCount === 7) return true;
    
    if (playerCount === 7) return true; // 7 players can have grand final
    
    // For 8+ players, grand final is typically played
    // This could be enhanced to check actual tournament progression
    return true;
  },

  // Determine if grand final will be played based on tournament structure and current state
  determineGrandFinalStatus: (playerCount: number, currentMatches: any[] = []): boolean => {
    if (playerCount === 1) return false; // Single player, no matches needed
    
    // For 2-7 players, grand final is possible if both players win one match each
    if (playerCount === 2 || playerCount === 3 || playerCount === 4 || playerCount === 5 || playerCount === 6 || playerCount === 7) return true;
    
    if (playerCount === 7) return true; // 7 players can have grand final
    
    // For 8+ players, check if the tournament structure supports grand final
    // This is a simplified check - in reality, it depends on bracket progression
    
    // If we have winner bracket and loser bracket structure, grand final is likely
    if (playerCount >= 8) {
      // Check if there are winner bracket and loser bracket matches
      const hasWinnerBracket = currentMatches.some(m => m.bracket === 'winner');
      const hasLoserBracket = currentMatches.some(m => m.bracket === 'loser');
      
      // If both brackets exist, grand final is possible
      if (hasWinnerBracket && hasLoserBracket) {
        return true;
      }
      
      // Default assumption for 8+ players
      return true;
    }
    
    return false;
  },

  // Calculate remaining matches based on completed matches
  calculateRemainingMatches: (totalMatches: number, completedMatches: number): number => {
    return Math.max(0, totalMatches - completedMatches);
  },

  // Get match progress percentage
  getMatchProgress: (totalMatches: number, completedMatches: number): number => {
    if (totalMatches === 0) return 100;
    return Math.round((completedMatches / totalMatches) * 100);
  }
}; 