import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { DeckList } from '@gwent/engine';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  IMPOSSIBLE_DECK,
  INCOMPLETE_DECK,
  OTHER_PROFILE_ID,
  PROFILE_ID,
  TEST_DECKS,
} from '../../../test/constants/test.constants';
import type { Deck as DeckRow } from '../../generated/prisma/client';
import { ProfilesService } from '../profiles/profiles.service';
import { DecksRepository } from './decks.repository';
import { DecksService } from './decks.service';

const DECK_ID = '33333333-3333-4333-8333-333333333333';

const toRow = (deck: DeckList): DeckRow => ({
  id: DECK_ID,
  profileId: PROFILE_ID,
  name: 'Norte',
  faction: deck.faction,
  leader: deck.leader,
  cards: deck.cards.map(([id, count]) => [id, count]),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

describe('DecksService', () => {
  let service: DecksService;
  const repository = {
    listByProfile: vi.fn<DecksRepository['listByProfile']>(),
    findOwned: vi.fn<DecksRepository['findOwned']>(),
    create: vi.fn<DecksRepository['create']>(),
    update: vi.fn<DecksRepository['update']>(),
    delete: vi.fn<DecksRepository['delete']>(),
  };
  const profiles = { ensureExists: vi.fn<ProfilesService['ensureExists']>() };

  beforeEach(async () => {
    vi.resetAllMocks();
    profiles.ensureExists.mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: DecksRepository, useValue: repository },
        { provide: ProfilesService, useValue: profiles },
      ],
    }).compile();
    service = moduleRef.get(DecksService);
  });

  it('saves the deck and returns it in the API format', async () => {
    repository.create.mockResolvedValue(toRow(TEST_DECKS.p1));
    const saved = await service.create(PROFILE_ID, { name: 'Norte', deck: TEST_DECKS.p1 });
    expect(saved).toEqual({
      id: DECK_ID,
      name: 'Norte',
      deck: TEST_DECKS.p1,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('accepts a deck under construction, like the local deck builder', async () => {
    repository.create.mockResolvedValue(toRow(INCOMPLETE_DECK));
    const saved = await service.create(PROFILE_ID, { name: 'Rascunho', deck: INCOMPLETE_DECK });
    expect(saved.deck).toEqual(INCOMPLETE_DECK);
  });

  it('rejects a card from another faction or too many copies with 422', async () => {
    const saving = service.create(PROFILE_ID, { name: 'Ruim', deck: IMPOSSIBLE_DECK });
    await expect(saving).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('does not list the decks of a profile that does not exist', async () => {
    profiles.ensureExists.mockRejectedValue(new NotFoundException('Profile not found'));
    await expect(service.list(OTHER_PROFILE_ID)).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.listByProfile).not.toHaveBeenCalled();
  });

  it("does not update another profile's deck", async () => {
    repository.findOwned.mockResolvedValue(null);
    const updating = service.update(OTHER_PROFILE_ID, DECK_ID, {
      name: 'Norte',
      deck: TEST_DECKS.p1,
    });
    await expect(updating).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('deletes only within the owner profile', async () => {
    repository.findOwned.mockResolvedValue(toRow(TEST_DECKS.p1));
    await service.remove(PROFILE_ID, DECK_ID);
    expect(repository.delete).toHaveBeenCalledWith(PROFILE_ID, DECK_ID);
  });
});
