import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { validateDeck, type DeckIssue, type DeckList } from '@gwent/engine';
import { DeckSchema, type DeckRecord } from '@gwent/shared';
import { ProfilesService } from '../profiles/profiles.service';
import { DecksRepository, type DeckData } from './decks.repository';

type DeckRow = {
  id: string;
  name: string;
  faction: string;
  leader: number;
  cards: unknown;
  updatedAt: Date;
};

/** Issues a saved deck may have (still under construction). Any other issue is never accepted. */
const ALLOWED_WHILE_BUILDING: ReadonlySet<DeckIssue['code']> = new Set([
  'NOT_ENOUGH_UNITS',
  'TOO_MANY_SPECIALS',
]);

export function toDeckRecord(row: DeckRow): DeckRecord {
  const deck = DeckSchema.parse({ faction: row.faction, leader: row.leader, cards: row.cards });
  return { id: row.id, name: row.name, deck, updatedAt: row.updatedAt.toISOString() };
}

/** Rejects impossible decks (unknown card, another faction, too many copies…). */
export function assertStorableDeck(deck: DeckList): void {
  const issues = validateDeck(deck).filter((i) => !ALLOWED_WHILE_BUILDING.has(i.code));
  if (issues.length > 0) {
    throw new UnprocessableEntityException({ message: 'Invalid deck', details: issues });
  }
}

@Injectable()
export class DecksService {
  constructor(
    private readonly decks: DecksRepository,
    private readonly profiles: ProfilesService,
  ) {}

  async list(profileId: string): Promise<DeckRecord[]> {
    await this.profiles.get(profileId);
    return (await this.decks.listByProfile(profileId)).map(toDeckRecord);
  }

  async create(profileId: string, data: DeckData): Promise<DeckRecord> {
    await this.profiles.get(profileId);
    assertStorableDeck(data.deck);
    return toDeckRecord(await this.decks.create(profileId, data));
  }

  async update(profileId: string, id: string, data: DeckData): Promise<DeckRecord> {
    await this.ensureOwned(profileId, id);
    assertStorableDeck(data.deck);
    return toDeckRecord(await this.decks.update(id, data));
  }

  async remove(profileId: string, id: string): Promise<void> {
    await this.ensureOwned(profileId, id);
    await this.decks.delete(id);
  }

  private async ensureOwned(profileId: string, id: string) {
    const row = await this.decks.findOwned(profileId, id);
    if (!row) throw new NotFoundException('Deck not found');
    return row;
  }
}
