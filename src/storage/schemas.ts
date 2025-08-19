import { z } from 'zod';

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  surname: z.string(),
  weight: z.number(),
  gender: z.enum(['male', 'female']),
  handPreference: z.enum(['left', 'right', 'both']),
  birthday: z.string().optional(),
  city: z.string().optional(),
  opponents: z.array(z.object({
    playerId: z.string(),
    matchDescription: z.string(),
    result: z.enum(['win', 'loss'])
  })).optional(), // Daha önce oynadığı rakiplerin ID'si, maç açıklaması ve sonucu
});

export const WeightRangeSchema = z.object({
  id: z.string(),
  name: z.string(),
  min: z.number(),
  max: z.number(),
  excludedPlayerIds: z.array(z.string()).optional(),
});

export const TournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  weightRanges: z.array(WeightRangeSchema),
  isExpanded: z.boolean().optional(),
  genderFilter: z.enum(['male', 'female']).nullable().optional(),
  handPreferenceFilter: z.enum(['left', 'right']).nullable().optional(),
  birthYearMin: z.number().nullable().optional(),
  birthYearMax: z.number().nullable().optional(),
});

export const MatchSchema = z.object({
  timestamp: z.number().optional(),
  id: z.string(),
  player1Id: z.string(),
  player2Id: z.string(),
  winnerId: z.string().optional(),
  bracket: z.enum(['winner', 'loser', 'placement']),
  round: z.number(),
  matchNumber: z.number(),
  isBye: z.boolean(),
  description: z.string().optional(),
  tablePosition: z.record(z.enum(['left', 'right'])).optional(),
});

export const RankingsSchema = z.object({
  first: z.string().optional(),
  second: z.string().optional(),
  third: z.string().optional(),
  fourth: z.string().optional(),
});

export const FixtureSchema = z.object({
  id: z.string(),
  name: z.string(),
  tournamentId: z.string(),
  tournamentName: z.string(),
  weightRangeId: z.string(),
  weightRangeName: z.string(),
  weightRange: z.object({ min: z.number(), max: z.number() }),
  players: z.array(PlayerSchema.partial().extend({ id: z.string() })),
  playerCount: z.number(),
  status: z.enum(['active', 'completed', 'paused']),
  createdAt: z.string(),
  lastUpdated: z.string(),
  completedAt: z.string().optional(),
  results: z.array(z.object({
    matchId: z.string(),
    winnerId: z.string(),
    loserId: z.string().optional(),
    timestamp: z.string(),
    type: z.string(),
  })),
  rankings: RankingsSchema.optional(),
  tournamentComplete: z.boolean().optional(),
  playerWins: z.record(z.number()),
  matches: z.array(MatchSchema),
  activeTab: z.enum(['active', 'completed', 'rankings']).optional(),
});

export const MatchStatusMapSchema = z.record(z.enum(['waiting', 'active', 'completed']));

export type Player = z.infer<typeof PlayerSchema>;
export type Tournament = z.infer<typeof TournamentSchema>;
export type WeightRange = z.infer<typeof WeightRangeSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;

export function safeParseOrDefault<T>(schema: z.ZodTypeAny, data: unknown, fallback: T): T {
  const parsed = schema.safeParse(data);
  return parsed.success ? (parsed.data as T) : fallback;
}


