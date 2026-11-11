import { COMBAT_ROWS } from '@gwent/engine';
import { z } from 'zod';
import { DeckSchema } from '../schemas/deck';

// HTTP API contracts. The server validates requests with these schemas
// (nestjs-zod) and the frontend validates responses with the same ones.

const Uuid = z.uuid();
const IsoDate = z.iso.datetime({ offset: true });

// --- Profiles ---

export const CreateProfileSchema = z.object({
  name: z.string().trim().min(1).max(40),
});
export type CreateProfile = z.infer<typeof CreateProfileSchema>;

export const ProfileSchema = z.object({
  id: Uuid,
  name: z.string(),
  createdAt: IsoDate,
});
export type Profile = z.infer<typeof ProfileSchema>;

// --- Decks ---

export const SaveDeckSchema = z.object({
  name: z.string().trim().min(1).max(60),
  deck: DeckSchema,
});
export type SaveDeck = z.infer<typeof SaveDeckSchema>;

export const DeckRecordSchema = z.object({
  id: Uuid,
  name: z.string(),
  deck: DeckSchema,
  updatedAt: IsoDate,
});
export type DeckRecord = z.infer<typeof DeckRecordSchema>;

// --- Matches ---

const PlayerIdSchema = z.enum(['p1', 'p2']);
const CardIdSchema = z.string().min(1).max(20);

/** Engine actions (same shape as GameAction). Legality is checked by the engine. */
export const GameActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('REDRAW'), player: PlayerIdSchema, cardId: CardIdSchema }),
  z.object({ type: z.literal('END_REDRAW'), player: PlayerIdSchema }),
  z.object({
    type: z.literal('PLAY_CARD'),
    player: PlayerIdSchema,
    cardId: CardIdSchema,
    row: z.enum(COMBAT_ROWS).optional(),
    targetId: CardIdSchema.optional(),
  }),
  z.object({ type: z.literal('ACTIVATE_LEADER'), player: PlayerIdSchema }),
  z.object({ type: z.literal('PASS'), player: PlayerIdSchema }),
  z.object({
    type: z.literal('CHOOSE'),
    player: PlayerIdSchema,
    optionIds: z.array(z.string().max(20)).max(20),
  }),
]);

/** Match rules chosen before the match (engine mutator ids, e.g. "noLeaders"). */
export const MutatorsSchema = z.array(z.string().min(1).max(30)).max(10);

/** Maximum actions accepted per match (a real match stays well below this). */
export const MAX_MATCH_ACTIONS = 2000;

export const CreateMatchSchema = z.object({
  seed: z.number().int().min(0).max(0xffffffff),
  decks: z.object({ p1: DeckSchema, p2: DeckSchema }),
  /** Extra match rules; missing means none. */
  mutators: MutatorsSchema.optional(),
  /** Every action of the match, in order (the human is always p1). */
  actions: z.array(GameActionSchema).min(1).max(MAX_MATCH_ACTIONS),
});
export type CreateMatch = z.infer<typeof CreateMatchSchema>;

export const MatchResultSchema = z.enum(['win', 'loss', 'draw']);
export type MatchResultKind = z.infer<typeof MatchResultSchema>;

export const RoundSummarySchema = z.object({
  round: z.number().int(),
  winner: PlayerIdSchema.nullable(),
  scores: z.object({ p1: z.number().int(), p2: z.number().int() }),
});

export const MatchModeSchema = z.enum(['bot', 'online']);
export type MatchMode = z.infer<typeof MatchModeSchema>;

export const MatchSummarySchema = z.object({
  id: Uuid,
  /** Who the opponent was: the bot or another person. */
  mode: MatchModeSchema,
  /** Seat the profile played (against the bot, the human is always p1). */
  side: PlayerIdSchema,
  /** The profile's faction and the opponent's faction. */
  faction: z.string(),
  opponent: z.string(),
  /** Online opponent name (null against the bot). */
  opponentName: z.string().nullable(),
  /** From the profile's point of view. */
  result: MatchResultSchema,
  /** Scores by seat (p1/p2); use `side` to show them from the profile's point of view. */
  rounds: z.array(RoundSummarySchema),
  /** Extra match rules that were on. */
  mutators: MutatorsSchema,
  createdAt: IsoDate,
});
export type MatchSummary = z.infer<typeof MatchSummarySchema>;

/** Full match: can be reproduced with createGame(seed, decks) + actions. */
export const MatchDetailSchema = MatchSummarySchema.extend({
  seed: z.number().int(),
  decks: z.object({ p1: DeckSchema, p2: DeckSchema }),
  actions: z.array(GameActionSchema),
});
export type MatchDetail = z.infer<typeof MatchDetailSchema>;

/** Version of the exported replay file format. */
export const REPLAY_FILE_VERSION = 1;

/**
 * Replay file (export/import): everything needed to rebuild the match with the engine,
 * plus a few labels to show while watching it.
 */
export const ReplayFileSchema = CreateMatchSchema.extend({
  version: z.literal(REPLAY_FILE_VERSION),
  /** Seat shown at the bottom by default. */
  side: PlayerIdSchema,
  names: z.object({ p1: z.string().max(40), p2: z.string().max(40) }),
  createdAt: IsoDate.optional(),
});
export type ReplayFile = z.infer<typeof ReplayFileSchema>;

/** Single API error format (AllExceptionsFilter). */
export const ApiErrorSchema = z.object({
  statusCode: z.number().int(),
  /** Stable error code in UPPER_SNAKE_CASE (NOT_FOUND, VALIDATION_ERROR, CONFLICT…). */
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
