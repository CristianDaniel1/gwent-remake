import { Test } from '@nestjs/testing';
import {
  applyAction,
  chooseAiAction,
  createGame,
  PLAYER_IDS,
  PREMADE_DECKS,
  randomFrom,
  type DeckList,
  type GameAction,
} from '@gwent/engine';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilesService } from '../profiles/profiles.service';
import { MatchReplayer } from './match-replayer';
import { MatchesRepository } from './matches.repository';
import { MatchesService } from './matches.service';

const HOST = '11111111-1111-4111-8111-111111111111';
const GUEST = '22222222-2222-4222-8222-222222222222';
const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[3] as DeckList };

/** Full bot-vs-bot match: seed, decks and actions, like a finished online room. */
function finishedMatch(seed: number) {
  let { state } = createGame({ seed, decks });
  const rng = randomFrom({ state: seed });
  const actions: GameAction[] = [];
  while (state.phase !== 'gameOver') {
    const action = PLAYER_IDS.map((p) => chooseAiAction(state, p, rng)).find(Boolean);
    if (!action) throw new Error('nobody acts');
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    actions.push(action);
  }
  return { seed, actions, winner: state.result };
}

describe('MatchesService.recordOnline', () => {
  let service: MatchesService;
  const repo = { create: vi.fn() };
  const profiles = { exists: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    repo.create.mockResolvedValue({});
    const moduleRef = await Test.createTestingModule({
      providers: [
        MatchesService,
        MatchReplayer,
        { provide: MatchesRepository, useValue: repo },
        { provide: ProfilesService, useValue: profiles },
      ],
    }).compile();
    service = moduleRef.get(MatchesService);
  });

  it("saves one entry per player with a profile, each from that player's point of view", async () => {
    profiles.exists.mockResolvedValue(true);
    const match = finishedMatch(5);
    await service.recordOnline({
      ...match,
      decks,
      players: { p1: { name: 'Geralt', profileId: HOST }, p2: { name: 'Ciri', profileId: GUEST } },
    });

    expect(repo.create).toHaveBeenCalledTimes(2);
    const [host, guest] = repo.create.mock.calls.map(([profileId, row]) => ({ profileId, row }));
    expect(host).toMatchObject({
      profileId: HOST,
      row: { mode: 'online', side: 'p1', opponentName: 'Ciri' },
    });
    expect(guest).toMatchObject({
      profileId: GUEST,
      row: { mode: 'online', side: 'p2', opponentName: 'Geralt' },
    });
    if (match.winner !== 'draw') {
      // Opposite results for the two seats
      expect(new Set([host?.row.result, guest?.row.result])).toEqual(new Set(['win', 'loss']));
    }
  });

  it('skips players without a profile or with a profile that no longer exists', async () => {
    profiles.exists.mockResolvedValue(false);
    await service.recordOnline({
      ...finishedMatch(6),
      decks,
      players: { p1: { name: 'Geralt', profileId: HOST }, p2: { name: 'Ciri' } },
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('does not throw when the match cannot be replayed', async () => {
    profiles.exists.mockResolvedValue(true);
    await expect(
      service.recordOnline({
        seed: 1,
        decks,
        actions: [{ type: 'PASS', player: 'p1' }],
        players: { p1: { name: 'Geralt', profileId: HOST }, p2: { name: 'Ciri' } },
      }),
    ).resolves.toBeUndefined();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
