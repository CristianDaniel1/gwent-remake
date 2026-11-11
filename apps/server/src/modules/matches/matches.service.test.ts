import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OTHER_PROFILE_ID, PROFILE_ID, TEST_DECKS } from '../../../test/constants/test.constants';
import { playBotMatch } from '../../../test/helpers/bot-match';
import { ProfilesService } from '../profiles/profiles.service';
import type { OnlineMatchRecord } from './interfaces/match-recorder.interface';
import { MatchReplayer } from './match-replayer';
import { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';

/**
 * Builds a finished online match between Geralt (p1) and Ciri (p2).
 *
 * @param seed - Match seed.
 * @param profileIds - Profile id of each player, when they have one.
 * @returns The match as the multiplayer rooms report it.
 */
const onlineMatch = (
  seed: number,
  profileIds: { p1?: string; p2?: string } = {},
): OnlineMatchRecord => {
  const { actions } = playBotMatch(seed);
  return {
    seed,
    decks: TEST_DECKS,
    actions,
    players: {
      p1: { name: 'Geralt', profileId: profileIds.p1 },
      p2: { name: 'Ciri', profileId: profileIds.p2 },
    },
  };
};

describe('MatchesService.recordOnline', () => {
  let service: MatchesService;
  const repository = { createMany: vi.fn<MatchesRepository['createMany']>() };
  const profiles = { exists: vi.fn<ProfilesService['exists']>() };

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    repository.createMany.mockResolvedValue([]);
    profiles.exists.mockResolvedValue(true);
    const moduleRef = await Test.createTestingModule({
      providers: [
        MatchesService,
        MatchReplayer,
        { provide: MatchesRepository, useValue: repository },
        { provide: ProfilesService, useValue: profiles },
      ],
    }).compile();
    service = moduleRef.get(MatchesService);
  });

  it("saves one entry per player with a profile, each from that player's point of view", async () => {
    await service.recordOnline(onlineMatch(5, { p1: PROFILE_ID, p2: OTHER_PROFILE_ID }));

    expect(repository.createMany).toHaveBeenCalledTimes(1);
    const [host, guest] = repository.createMany.mock.calls[0]?.[0] ?? [];
    expect(host).toMatchObject({
      profileId: PROFILE_ID,
      match: { mode: 'online', side: 'p1', opponentName: 'Ciri' },
    });
    expect(guest).toMatchObject({
      profileId: OTHER_PROFILE_ID,
      match: { mode: 'online', side: 'p2', opponentName: 'Geralt' },
    });
  });

  it('gives the two seats opposite results when someone wins', async () => {
    expect(playBotMatch(5).winner).not.toBe('draw');
    await service.recordOnline(onlineMatch(5, { p1: PROFILE_ID, p2: OTHER_PROFILE_ID }));
    const entries = repository.createMany.mock.calls[0]?.[0] ?? [];
    const results = new Set(entries.map((entry) => entry.match.result));
    expect(results).toEqual(new Set(['win', 'loss']));
  });

  it('skips players without a profile or with a profile that no longer exists', async () => {
    profiles.exists.mockResolvedValue(false);
    await service.recordOnline(onlineMatch(6, { p1: PROFILE_ID }));
    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it('logs instead of throwing when the match cannot be replayed', async () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const forged = { ...onlineMatch(6, { p1: PROFILE_ID }), actions: [] };
    await expect(service.recordOnline(forged)).resolves.toBeUndefined();
    expect(repository.createMany).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledOnce();
  });

  it('logs instead of throwing when the database fails', async () => {
    const logError = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    repository.createMany.mockRejectedValue(new Error('connection lost'));
    const recording = service.recordOnline(onlineMatch(7, { p1: PROFILE_ID }));
    await expect(recording).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledOnce();
  });
});
