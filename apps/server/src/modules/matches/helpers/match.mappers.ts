import { opponentOf } from '@gwent/engine';
import {
  MatchDetailSchema,
  MatchSummarySchema,
  type MatchDetail,
  type MatchSummary,
} from '@gwent/shared';
import type { Match, Prisma } from '../../../generated/prisma/client';
import type { MatchHistoryEntry, MatchSummaryRow } from '../interfaces/match.interfaces';

/**
 * Types plain data for a JSON column. Prisma's JSON input type has an index signature, which
 * interfaces like RoundResult do not, so the compiler rejects them even though they are valid JSON.
 *
 * @param value - Plain data (no dates, functions or class instances).
 * @returns The same value typed for a JSON column.
 */
const toJson = (value: unknown) => value as Prisma.InputJsonValue;

/**
 * Converts a history entry into table columns.
 *
 * @param entry - Profile and match to save.
 * @returns The column values of the match row.
 */
export const toMatchColumns = ({ profileId, match }: MatchHistoryEntry) => ({
  profileId,
  seed: BigInt(match.seed),
  mode: match.mode,
  side: match.side,
  faction: match.decks[match.side].faction,
  opponent: match.decks[opponentOf(match.side)].faction,
  opponentName: match.opponentName,
  result: match.result,
  rounds: toJson(match.rounds),
  decks: toJson(match.decks),
  mutators: match.mutators ?? [],
  actions: toJson(match.actions),
});

/**
 * Converts a summary row into the API format, validating the stored JSON.
 *
 * @param row - Match summary row.
 * @returns The match summary as the API returns it.
 */
export const toMatchSummary = (row: MatchSummaryRow): MatchSummary =>
  MatchSummarySchema.parse({ ...row, createdAt: row.createdAt.toISOString() });

/**
 * Converts a full match row into the API format, validating the stored JSON.
 *
 * @param row - Match row.
 * @returns The match with seed, decks and actions.
 */
export const toMatchDetail = (row: Match): MatchDetail =>
  MatchDetailSchema.parse({
    ...row,
    seed: Number(row.seed),
    createdAt: row.createdAt.toISOString(),
  });
