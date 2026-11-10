import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PREMADE_DECKS, type DeckList } from '@gwent/engine';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilesService } from '../profiles/profiles.service';
import { DecksRepository } from './decks.repository';
import { DecksService } from './decks.service';

const PROFILE = '11111111-1111-4111-8111-111111111111';
const row = (deck: DeckList) => ({
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Norte',
  faction: deck.faction,
  leader: deck.leader,
  cards: deck.cards,
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

describe('DecksService', () => {
  let service: DecksService;
  const repo = {
    listByProfile: vi.fn(),
    findOwned: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const profiles = { get: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    profiles.get.mockResolvedValue({ id: PROFILE, name: 'Geralt', createdAt: '' });
    const moduleRef = await Test.createTestingModule({
      providers: [
        DecksService,
        { provide: DecksRepository, useValue: repo },
        { provide: ProfilesService, useValue: profiles },
      ],
    }).compile();
    service = moduleRef.get(DecksService);
  });

  it('saves the deck and returns it in the API format', async () => {
    const deck = PREMADE_DECKS[0] as DeckList;
    repo.create.mockResolvedValue(row(deck));
    const saved = await service.create(PROFILE, { name: 'Norte', deck });
    expect(saved).toMatchObject({ name: 'Norte', deck, updatedAt: '2026-01-01T00:00:00.000Z' });
  });

  it('accepts a deck under construction (few units), like the local deck builder', async () => {
    const building: DeckList = { faction: 'realms', leader: 22, cards: [[27, 1]] };
    repo.create.mockResolvedValue(row(building));
    await expect(
      service.create(PROFILE, { name: 'Rascunho', deck: building }),
    ).resolves.toBeTruthy();
  });

  it('rejects a card from another faction or too many copies with 422', async () => {
    const wrong: DeckList = {
      faction: 'realms',
      leader: 22,
      cards: [
        [61, 1],
        [1, 4],
      ],
    };
    await expect(service.create(PROFILE, { name: 'Ruim', deck: wrong })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("does not update another profile's deck (404)", async () => {
    repo.findOwned.mockResolvedValue(null);
    await expect(
      service.update(PROFILE, '33333333-3333-4333-8333-333333333333', {
        name: 'x',
        deck: PREMADE_DECKS[0] as DeckList,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
