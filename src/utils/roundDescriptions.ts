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
  }
}; 