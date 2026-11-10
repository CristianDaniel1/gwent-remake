import { Injectable } from '@nestjs/common';
import type { PlayerId, RoundResult } from '@gwent/engine';
import type { CreateMatch, MatchMode, MatchResultKind } from '@gwent/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface NewMatch extends CreateMatch {
  mode: MatchMode;
  /** Seat the profile played. */
  side: PlayerId;
  opponentName: string | null;
  /** From the profile's point of view. */
  result: MatchResultKind;
  rounds: RoundResult[];
}

/** List columns (without the actions, which can be large). */
const SUMMARY = {
  id: true,
  mode: true,
  side: true,
  faction: true,
  opponent: true,
  opponentName: true,
  mutators: true,
  result: true,
  rounds: true,
  createdAt: true,
} as const;

@Injectable()
export class MatchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(profileId: string, match: NewMatch) {
    const other: PlayerId = match.side === 'p1' ? 'p2' : 'p1';
    return this.prisma.match.create({
      data: {
        profileId,
        seed: BigInt(match.seed),
        mode: match.mode,
        side: match.side,
        faction: match.decks[match.side].faction,
        opponent: match.decks[other].faction,
        opponentName: match.opponentName,
        result: match.result,
        rounds: match.rounds as object[],
        decks: match.decks as object,
        mutators: match.mutators ?? [],
        actions: match.actions as object[],
      },
      select: SUMMARY,
    });
  }

  listByProfile(profileId: string, take: number) {
    return this.prisma.match.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take,
      select: SUMMARY,
    });
  }

  findById(id: string) {
    return this.prisma.match.findUnique({ where: { id } });
  }
}
