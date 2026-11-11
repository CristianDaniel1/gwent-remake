import { Injectable } from '@nestjs/common';
import type { SaveDeck } from '@gwent/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { toDeckColumns } from './helpers/deck.mappers';

/** Database access for the decks of each profile. */
@Injectable()
export class DecksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists the decks of a profile, most recently changed first.
   *
   * @param profileId - Owner profile id.
   * @returns The deck rows.
   */
  listByProfile(profileId: string) {
    return this.prisma.deck.findMany({ where: { profileId }, orderBy: { updatedAt: 'desc' } });
  }

  /**
   * Finds a deck that belongs to a profile.
   *
   * @param profileId - Owner profile id.
   * @param id - Deck id.
   * @returns The deck row, or null when it does not exist or belongs to another profile.
   */
  findOwned(profileId: string, id: string) {
    return this.prisma.deck.findFirst({ where: { id, profileId } });
  }

  /**
   * Inserts a deck.
   *
   * @param profileId - Owner profile id.
   * @param deckInput - Deck name and card list.
   * @returns The created row.
   */
  create(profileId: string, deckInput: SaveDeck) {
    return this.prisma.deck.create({ data: { profileId, ...toDeckColumns(deckInput) } });
  }

  /**
   * Replaces a deck of a profile.
   *
   * @param profileId - Owner profile id.
   * @param id - Deck id.
   * @param deckInput - New name and card list.
   * @returns The updated row.
   */
  update(profileId: string, id: string, deckInput: SaveDeck) {
    return this.prisma.deck.update({ where: { id, profileId }, data: toDeckColumns(deckInput) });
  }

  /**
   * Deletes a deck of a profile.
   *
   * @param profileId - Owner profile id.
   * @param id - Deck id.
   * @returns The deleted row.
   */
  delete(profileId: string, id: string) {
    return this.prisma.deck.delete({ where: { id, profileId } });
  }
}
