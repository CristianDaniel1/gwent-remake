import { UnprocessableEntityException } from '@nestjs/common';
import {
  applyAction,
  chooseAiAction,
  createGame,
  PREMADE_DECKS,
  randomFrom,
  type DeckList,
  type GameAction,
} from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { MatchReplayer } from './match-replayer';

const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[4] as DeckList };

/** Full match played by the bot on both sides. */
function botMatch(seed: number) {
  let { state } = createGame({ seed, decks });
  const actions: GameAction[] = [];
  const rng = randomFrom({ state: seed });
  while (state.phase !== 'gameOver') {
    const action = chooseAiAction(state, 'p1', rng) ?? chooseAiAction(state, 'p2', rng);
    if (!action) throw new Error('nobody acts');
    actions.push(action);
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
  }
  return { seed, actions, result: state.result };
}

describe('MatchReplayer', () => {
  const replayer = new MatchReplayer();

  it('replays the match and reaches the same result', () => {
    for (const seed of [1, 2, 3]) {
      const match = botMatch(seed);
      const outcome = replayer.replay({ seed, decks, actions: match.actions });
      const expected = match.result === 'draw' ? 'draw' : match.result === 'p1' ? 'win' : 'loss';
      expect(outcome.result).toBe(expected);
      expect(outcome.rounds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects a match that did not finish', () => {
    const { actions } = botMatch(5);
    expect(() => replayer.replay({ seed: 5, decks, actions: actions.slice(0, 4) })).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects an illegal action and reports which one it was', () => {
    const { actions } = botMatch(6);
    const forged = [...actions];
    forged[3] = { type: 'PASS', player: 'p2' };
    try {
      replayer.replay({ seed: 6, decks, actions: forged });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
        details: { index: expect.any(Number) },
      });
    }
  });

  it('rejects a deck that could not be played', () => {
    const incomplete: DeckList = { faction: 'realms', leader: 22, cards: [[27, 1]] };
    expect(() =>
      replayer.replay({ seed: 1, decks: { p1: incomplete, p2: decks.p2 }, actions: [] }),
    ).toThrow(/Invalid deck for p1/);
  });

  it('rejects unknown mutators', () => {
    expect(() =>
      replayer.replay({
        seed: 1,
        decks,
        actions: [{ type: 'PASS', player: 'p1' }],
        mutators: ['nope'],
      }),
    ).toThrow(UnprocessableEntityException);
  });
});
