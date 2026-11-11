import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PLAYER_IDS, opponentOf } from '@gwent/engine';
import type { CreateMatch, MatchDetail, MatchSummary } from '@gwent/shared';
import { describeError } from '../../common/helpers/describe-error';
import { ProfilesService } from '../profiles/profiles.service';
import { MATCH_HISTORY_LIMIT } from './constants/matches.constants';
import { toMatchDetail, toMatchSummary } from './helpers/match.mappers';
import { resultFor } from './helpers/match-result';
import type { MatchRecorder, OnlineMatchRecord } from './interfaces/match-recorder.interface';
import type { MatchHistoryEntry } from './interfaces/match.interfaces';
import { MatchReplayer } from './match-replayer';
import { MatchesRepository } from './matches.repository';

/** Match history: saves finished matches (after replaying them) and reads them back. */
@Injectable()
export class MatchesService implements MatchRecorder {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    private readonly matches: MatchesRepository,
    private readonly profiles: ProfilesService,
    private readonly replayer: MatchReplayer,
  ) {}

  /**
   * Saves a finished match against the bot after replaying it and checking the result.
   *
   * @param profileId - Profile that played (always p1).
   * @param input - Seed, decks, mutators and actions of the match.
   * @returns The saved match summary.
   * @throws NotFoundException - When the profile does not exist.
   * @throws UnprocessableEntityException - When the match cannot be replayed or did not finish.
   */
  async record(profileId: string, input: CreateMatch): Promise<MatchSummary> {
    await this.profiles.ensureExists(profileId);
    const { result, rounds } = this.replayer.replay(input);
    const row = await this.matches.create({
      profileId,
      match: { ...input, mode: 'bot', side: 'p1', opponentName: null, result, rounds },
    });
    return toMatchSummary(row);
  }

  /**
   * Saves a finished online match to the history of each player who has a profile, in one
   * transaction. Never throws: a failure here must not affect the room.
   *
   * @param record - Seed, decks, actions and players of the match.
   */
  async recordOnline({ players, ...input }: OnlineMatchRecord): Promise<void> {
    try {
      const { state, rounds } = this.replayer.replay(input);
      const entries: MatchHistoryEntry[] = [];
      for (const side of PLAYER_IDS) {
        const profileId = players[side].profileId;
        if (!profileId) continue;
        const profileExists = await this.profiles.exists(profileId);
        if (!profileExists) continue;
        entries.push({
          profileId,
          match: {
            ...input,
            mode: 'online',
            side,
            opponentName: players[opponentOf(side)].name,
            result: resultFor(state, side),
            rounds,
          },
        });
      }
      if (entries.length) await this.matches.createMany(entries);
    } catch (error) {
      const names = `${players.p1.name} vs ${players.p2.name}`;
      this.logger.error(`Could not record the online match ${names}`, describeError(error));
    }
  }

  /**
   * Lists the latest matches of a profile.
   *
   * @param profileId - Profile id.
   * @returns Up to MATCH_HISTORY_LIMIT summaries, newest first.
   * @throws NotFoundException - When the profile does not exist.
   */
  async history(profileId: string): Promise<MatchSummary[]> {
    await this.profiles.ensureExists(profileId);
    const rows = await this.matches.listByProfile(profileId, MATCH_HISTORY_LIMIT);
    return rows.map(toMatchSummary);
  }

  /**
   * Reads a full match, with everything needed to replay it.
   *
   * @param id - Match id.
   * @returns The match with seed, decks and actions.
   * @throws NotFoundException - When the match does not exist.
   */
  async detail(id: string): Promise<MatchDetail> {
    const row = await this.matches.findById(id);
    if (!row) throw new NotFoundException('Match not found');
    return toMatchDetail(row);
  }
}
