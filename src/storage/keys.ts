/*
 * Centralized key builders for storage paths (without prefix/version)
 */

export const META_KEY = 'meta';

export const PLAYERS = {
  LIST: 'players/list',
  COLUMNS: 'players/columns',
} as const;

export const TOURNAMENTS = {
  LIST: 'tournaments/list',
  SELECTED_TOURNAMENT: 'tournaments/selected/tournamentId',
  SELECTED_WEIGHT_RANGE: 'tournaments/selected/weightRangeId',
  PLAYER_FILTERS: 'tournaments/playerFilters',
} as const;

export const MATCHES = {
  INDEX: 'matches/index',
  ACTIVE_ID: 'matches/activeFixtureId',
  FIXTURE: (fixtureId: string) => `matches/fixtures/${fixtureId}`,
  STATUSES: (fixtureId: string) => `matches/statuses/${fixtureId}`,
} as const;

export const DOUBLE_ELIMINATION = {
  STATE: (fixtureId: string) => `de/${fixtureId}`,
} as const;

export const RESULTS = {
  KEY: (tournamentId: string, weightRangeId: string) => `results/${tournamentId}/${weightRangeId}`,
} as const;


