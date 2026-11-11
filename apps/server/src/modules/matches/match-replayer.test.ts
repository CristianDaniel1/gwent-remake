import { UnprocessableEntityException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  INCOMPLETE_DECK,
  P1_RESULT_BY_WINNER,
  TEST_DECKS,
} from '../../../test/constants/test.constants';
import { playBotMatch } from '../../../test/helpers/bot-match';
import { MatchReplayer } from './match-replayer';

/**
 * Runs a function and returns what it threw.
 *
 * @param run - Function expected to throw.
 * @returns The thrown value.
 */
const thrownBy = (run: () => unknown): unknown => {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the function to throw');
};

describe('MatchReplayer', () => {
  const replayer = new MatchReplayer();

  it.each([1, 2, 3])('replays the match of seed %i and reaches the same result', (seed) => {
    const { actions, state, winner } = playBotMatch(seed);
    const outcome = replayer.replay({ seed, decks: TEST_DECKS, actions });
    expect(outcome.result).toBe(P1_RESULT_BY_WINNER[winner]);
    expect(outcome.rounds).toEqual(state.roundHistory);
  });

  it('rejects a match that did not finish', () => {
    const { actions } = playBotMatch(5);
    const replay = () =>
      replayer.replay({ seed: 5, decks: TEST_DECKS, actions: actions.slice(0, 4) });
    expect(replay).toThrow('The match did not finish');
  });

  it('rejects an illegal action and reports its position', () => {
    const { actions } = playBotMatch(6);
    const forged = actions.with(3, { type: 'PASS', player: 'p2' });
    const error = thrownBy(() => replayer.replay({ seed: 6, decks: TEST_DECKS, actions: forged }));
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject({
      details: { index: 3 },
    });
  });

  it('rejects a deck that could not be played', () => {
    const decks = { p1: INCOMPLETE_DECK, p2: TEST_DECKS.p2 };
    expect(() => replayer.replay({ seed: 1, decks, actions: [] })).toThrow('Invalid deck for p1');
  });

  it('rejects unknown mutators', () => {
    const replay = () =>
      replayer.replay({
        seed: 1,
        decks: TEST_DECKS,
        actions: [{ type: 'PASS', player: 'p1' }],
        mutators: ['nope'],
      });
    expect(replay).toThrow('Unknown mutators');
  });
});
