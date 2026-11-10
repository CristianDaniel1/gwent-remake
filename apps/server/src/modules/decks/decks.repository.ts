import { Injectable } from '@nestjs/common';
import type { DeckList } from '@gwent/engine';
import { PrismaService } from '../../prisma/prisma.service';

export interface DeckData {
  name: string;
  deck: DeckList;
}

const toColumns = ({ name, deck }: DeckData) => ({
  name,
  faction: deck.faction,
  leader: deck.leader,
  cards: deck.cards.map(([id, count]) => [id, count]),
});

@Injectable()
export class DecksRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByProfile(profileId: string) {
    return this.prisma.deck.findMany({ where: { profileId }, orderBy: { updatedAt: 'desc' } });
  }

  findOwned(profileId: string, id: string) {
    return this.prisma.deck.findFirst({ where: { id, profileId } });
  }

  create(profileId: string, data: DeckData) {
    return this.prisma.deck.create({ data: { profileId, ...toColumns(data) } });
  }

  update(id: string, data: DeckData) {
    return this.prisma.deck.update({ where: { id }, data: toColumns(data) });
  }

  delete(id: string) {
    return this.prisma.deck.delete({ where: { id } });
  }
}
