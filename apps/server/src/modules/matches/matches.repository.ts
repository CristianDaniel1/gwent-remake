import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MATCH_SUMMARY_SELECT } from './constants/matches.constants';
import { toMatchColumns } from './helpers/match.mappers';
import type { MatchHistoryEntry } from './interfaces/match.interfaces';

/** Database access for the match history. */
@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Saves a match in one profile's history.
   *
   * @param entry - Profile and match to save.
   * @returns The summary columns of the created row.
   */
  create(entry: MatchHistoryEntry) {
    return this.prisma.match.create({ data: toMatchColumns(entry), select: MATCH_SUMMARY_SELECT });
  }

  /**
   * Saves several history entries in one transaction: all of them or none.
   *
   * @param entries - Profiles and matches to save.
   * @returns The summary columns of the created rows.
   */
  createMany(entries: MatchHistoryEntry[]) {
    return this.prisma.$transaction(
      entries.map((entry) =>
        this.prisma.match.create({ data: toMatchColumns(entry), select: MATCH_SUMMARY_SELECT }),
      ),
    );
  }

  /**
   * Lists the latest matches of a profile, newest first.
   *
   * @param profileId - Profile id.
   * @param take - Maximum number of matches.
   * @returns The summary rows.
   */
  listByProfile(profileId: string, take: number) {
    return this.prisma.match.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take,
      select: MATCH_SUMMARY_SELECT,
    });
  }

  findById(id: string) {
    return this.prisma.match.findUnique({ where: { id } });
  }
}
