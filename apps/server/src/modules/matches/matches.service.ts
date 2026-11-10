import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PLAYER_IDS, opponentOf } from '@gwent/engine';
import {
  MatchDetailSchema,
  MatchSummarySchema,
  type CreateMatch,
  type MatchDetail,
  type MatchSummary,
} from '@gwent/shared';
import { ProfilesService } from '../profiles/profiles.service';
import type { MatchRecorder, OnlineMatchRecord } from './match-recorder';
import { MatchReplayer, resultFor } from './match-replayer';
import { MatchesRepository } from './matches.repository';

/** How many matches the history list returns. */
export const HISTORY_SIZE = 50;

type SummaryRow = {
  id: string;
  mode: string;
  side: string;
  faction: string;
  opponent: string;
  opponentName: string | null;
  mutators: unknown;
  result: string;
  rounds: unknown;
  createdAt: Date;
};

// The database stores JSON: we validate on the way out so the API never returns something outside the contract.
const toSummary = (row: SummaryRow): MatchSummary =>
  MatchSummarySchema.parse({ ...row, createdAt: row.createdAt.toISOString() });

@Injectable()
export class MatchesService implements MatchRecorder {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly matches: MatchesRepository,
    private readonly profiles: ProfilesService,
    private readonly replayer: MatchReplayer,
  ) {}

  /** Saves a finished match against the bot after replaying it and checking the result. */
  async record(profileId: string, input: CreateMatch): Promise<MatchSummary> {
    await this.profiles.get(profileId);
    const { result, rounds } = this.replayer.replay(input);
    const row = await this.matches.create(profileId, {
      ...input,
      mode: 'bot',
      side: 'p1',
      opponentName: null,
      result,
      rounds,
    });
    return toSummary(row);
  }

  /**
   * Saves a finished online match to the history of each player who has a profile.
   * Never throws: a failure here must not affect the room.
   */
  async recordOnline({ players, ...input }: OnlineMatchRecord): Promise<void> {
    try {
      const { state, rounds } = this.replayer.replay(input);
      for (const side of PLAYER_IDS) {
        const profileId = players[side].profileId;
        if (!profileId || !(await this.profiles.exists(profileId))) continue;
        await this.matches.create(profileId, {
          ...input,
          mode: 'online',
          side,
          opponentName: players[opponentOf(side)].name,
          result: resultFor(state, side),
          rounds,
        });
      }
    } catch (error) {
      this.logger.warn(`Could not record an online match: ${String(error)}`);
    }
  }

  async history(profileId: string): Promise<MatchSummary[]> {
    await this.profiles.get(profileId);
    return (await this.matches.listByProfile(profileId, HISTORY_SIZE)).map(toSummary);
  }

  async detail(id: string): Promise<MatchDetail> {
    const row = await this.matches.findById(id);
    if (!row) throw new NotFoundException('Match not found');
    return MatchDetailSchema.parse({
      ...row,
      seed: Number(row.seed),
      createdAt: row.createdAt.toISOString(),
    });
  }
}
