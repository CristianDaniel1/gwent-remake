import { Injectable, NotFoundException } from '@nestjs/common';
import type { DeckRecord, SaveDeck } from '@gwent/shared';
import { ProfilesService } from '../profiles/profiles.service';
import { DecksRepository } from './decks.repository';
import { toDeckRecord } from './helpers/deck.mappers';
import { assertStorableDeck } from './helpers/deck.validation';

/** Decks saved on the server for each profile. */
@Injectable()
export class DecksService {
  constructor(
    private readonly decks: DecksRepository,
    private readonly profiles: ProfilesService,
  ) {}

  /**
   * Lists the decks of a profile.
   *
   * @param profileId - Owner profile id.
   * @returns The decks, most recently changed first.
   * @throws NotFoundException - When the profile does not exist.
   */
  async list(profileId: string): Promise<DeckRecord[]> {
    await this.profiles.ensureExists(profileId);
    const rows = await this.decks.listByProfile(profileId);
    return rows.map(toDeckRecord);
  }

  /**
   * Saves a new deck.
   *
   * @param profileId - Owner profile id.
   * @param deckInput - Deck name and card list.
   * @returns The saved deck.
   * @throws NotFoundException - When the profile does not exist.
   * @throws UnprocessableEntityException - When the deck breaks the building rules.
   */
  async create(profileId: string, deckInput: SaveDeck): Promise<DeckRecord> {
    await this.profiles.ensureExists(profileId);
    assertStorableDeck(deckInput.deck);
    const row = await this.decks.create(profileId, deckInput);
    return toDeckRecord(row);
  }

  /**
   * Replaces a deck of the profile.
   *
   * @param profileId - Owner profile id.
   * @param id - Deck id.
   * @param deckInput - New name and card list.
   * @returns The saved deck.
   * @throws NotFoundException - When the deck does not exist or belongs to another profile.
   * @throws UnprocessableEntityException - When the deck breaks the building rules.
   */
  async update(profileId: string, id: string, deckInput: SaveDeck): Promise<DeckRecord> {
    await this.ensureOwned(profileId, id);
    assertStorableDeck(deckInput.deck);
    const row = await this.decks.update(profileId, id, deckInput);
    return toDeckRecord(row);
  }

  /**
   * Deletes a deck of the profile.
   *
   * @param profileId - Owner profile id.
   * @param id - Deck id.
   * @throws NotFoundException - When the deck does not exist or belongs to another profile.
   */
  async remove(profileId: string, id: string): Promise<void> {
    await this.ensureOwned(profileId, id);
    await this.decks.delete(profileId, id);
  }

  private async ensureOwned(profileId: string, id: string): Promise<void> {
    const deck = await this.decks.findOwned(profileId, id);
    if (!deck) throw new NotFoundException('Deck not found');
  }
}
