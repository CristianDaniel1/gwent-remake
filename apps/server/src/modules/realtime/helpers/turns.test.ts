import { applyAction, createGame, type GameAction, type GameState } from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { TEST_DECKS } from '../../../../test/constants/test.constants';
import { playBotMatch } from '../../../../test/helpers/bot-match';
import { timeoutAction, waitingFor } from './turns';

/**
 * Applies actions that must be legal.
 *
 * @param state - Starting state.
 * @param actions - Actions to apply in order.
 * @returns The state after the actions.
 */
const applyAll = (state: GameState, actions: GameAction[]) =>
  actions.reduce((current, action) => {
    const result = applyAction(current, action);
    if (!result.ok) throw new Error(result.error.code);
    return result.state;
  }, state);

const newGame = () => createGame({ seed: 1, decks: TEST_DECKS }).state;

describe('waitingFor', () => {
  it('waits for both players during the redraw', () => {
    expect(waitingFor(newGame())).toEqual(['p1', 'p2']);
  });

  it('stops waiting for a player who ended the redraw', () => {
    const state = applyAll(newGame(), [{ type: 'END_REDRAW', player: 'p1' }]);
    expect(waitingFor(state)).toEqual(['p2']);
  });

  it('waits only for the current player after the redraw', () => {
    const state = applyAll(newGame(), [
      { type: 'END_REDRAW', player: 'p1' },
      { type: 'END_REDRAW', player: 'p2' },
    ]);
    expect(waitingFor(state)).toEqual([state.currentPlayer]);
  });

  it('waits for nobody when the match is over', () => {
    expect(waitingFor(playBotMatch(1).state)).toEqual([]);
  });
});

describe('timeoutAction', () => {
  it('ends the redraw', () => {
    expect(timeoutAction(newGame(), 'p1')).toEqual({ type: 'END_REDRAW', player: 'p1' });
  });

  it('passes the round on a normal turn', () => {
    const state = applyAll(newGame(), [
      { type: 'END_REDRAW', player: 'p1' },
      { type: 'END_REDRAW', player: 'p2' },
    ]);
    const player = state.currentPlayer ?? 'p1';
    expect(timeoutAction(state, player)).toEqual({ type: 'PASS', player });
  });

  it('has no move for a finished match', () => {
    expect(timeoutAction(playBotMatch(1).state, 'p1')).toBeNull();
  });
});
