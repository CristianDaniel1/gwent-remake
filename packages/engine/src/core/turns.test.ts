import { describe, expect, it } from 'vitest';
import { opponentOf, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import {
  act,
  expectCardsConserved,
  startedGame,
  withHand,
  withoutFactionAbilities,
  withoutLeaders,
} from '../testing/builders';
import { applyAction } from './apply-action';
import { getLegalActions } from './legal-actions';
import { computeBoard } from './scoring';

// Cards without abilities used in the scenarios
const BALLISTA = 27; // realms, siege, 6
const DETHMOLD = 31; // realms, ranged, 6
const FOOT_SOLDIER = 42; // realms, close, 1
const VES = 52; // realms, close, 5
const HARPY = 103; // monsters, agile, 2
const FIEND = 111; // monsters, close, 6
const BOTCHLING = 102; // monsters, close, 4
const TRISS = 12; // neutral, hero, close, 7

/**
 * Game started with fixed hands and p1 starting, without leaders.
 * Faction abilities are off unless `factions` is true.
 */
function setup(
  hands: Record<PlayerId, number[]>,
  { factions = false, ...options }: Parameters<typeof startedGame>[0] & { factions?: boolean } = {},
): GameState {
  let state = withoutLeaders(startedGame(options));
  if (!factions) state = withoutFactionAbilities(state);
  state = withHand(state, 'p1', hands.p1);
  state = withHand(state, 'p2', hands.p2);
  return { ...state, currentPlayer: 'p1', firstPlayer: 'p1' };
}

const play = (
  state: GameState,
  player: PlayerId,
  index: number,
  row?: 'close' | 'ranged' | 'siege',
) =>
  act(state, {
    type: 'PLAY_CARD',
    player,
    cardId: state.players[player].hand[index]!,
    ...(row ? { row } : {}),
  });

describe('turns', () => {
  it('puts a played unit in its row and hands over the turn', () => {
    const state = setup({ p1: [BALLISTA, VES], p2: [FIEND, BOTCHLING] });
    const cardId = state.players.p1.hand[0]!;
    const { state: next, events } = play(state, 'p1', 0);

    expect(next.players.p1.hand).not.toContain(cardId);
    expect(next.players.p1.rows.siege.units).toEqual([cardId]);
    expect(next.currentPlayer).toBe('p2');
    expect(events).toEqual([
      { type: 'CARD_PLAYED', player: 'p1', cardId, row: 'siege' },
      {
        type: 'CARD_MOVED',
        cardId,
        from: { kind: 'hand', player: 'p1' },
        to: { kind: 'row', side: 'p1', row: 'siege' },
        reason: 'play',
      },
      { type: 'TURN_STARTED', player: 'p2' },
    ]);
    expect(computeBoard(next).p1).toMatchObject({ total: 6, rows: { siege: { total: 6 } } });
    expectCardsConserved(next);
  });

  it('does not mutate the given state', () => {
    const state = setup({ p1: [BALLISTA], p2: [FIEND] });
    const snapshot = JSON.stringify(state);
    play(state, 'p1', 0);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('rejects a move out of turn', () => {
    const state = setup({ p1: [BALLISTA], p2: [FIEND] });
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      player: 'p2',
      cardId: state.players.p2.hand[0]!,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });
  });

  it('does not let a fixed-row unit go to another row', () => {
    const state = setup({ p1: [BALLISTA], p2: [FIEND] });
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: state.players.p1.hand[0]!,
      row: 'close',
    });
    expect(result.ok).toBe(false);
  });

  it('lets an agile unit go to close or ranged and requires choosing', () => {
    const state = setup({ p1: [BALLISTA], p2: [HARPY, FIEND] });
    const afterP1 = play(state, 'p1', 0).state;
    const harpy = afterP1.players.p2.hand[0]!;

    const rows = getLegalActions(afterP1, 'p2')
      .filter((a) => a.type === 'PLAY_CARD' && a.cardId === harpy)
      .map((a) => (a.type === 'PLAY_CARD' ? a.row : null));
    expect(rows).toEqual(['close', 'ranged']);
    expect(applyAction(afterP1, { type: 'PLAY_CARD', player: 'p2', cardId: harpy }).ok).toBe(false);
    expect(play(afterP1, 'p2', 0, 'ranged').state.players.p2.rows.ranged.units).toEqual([harpy]);
  });

  it('lets the other player keep playing several times after one passes', () => {
    let state = setup({ p1: [BALLISTA, VES], p2: [FIEND, BOTCHLING] });
    state = act(state, { type: 'PASS', player: 'p1' }).state;
    expect(state.currentPlayer).toBe('p2');
    state = play(state, 'p2', 0).state;
    expect(state.currentPlayer).toBe('p2');
    expect(getLegalActions(state, 'p1')).toEqual([]);
  });

  it('passes automatically when a player runs out of cards', () => {
    const state = setup({ p1: [BALLISTA], p2: [FIEND, BOTCHLING] });
    const { state: next, events } = play(state, 'p1', 0);
    expect(next.players.p1.passed).toBe(true);
    expect(events).toContainEqual({ type: 'PLAYER_PASSED', player: 'p1', automatic: true });
    expect(next.currentPlayer).toBe('p2');
  });
});

describe('rounds', () => {
  /**
   * Each player plays the first card in hand; then whoever can still play passes, until the round ends.
   * Returns the result of the last action (with the round end events).
   */
  function playRound(state: GameState) {
    const round = state.round;
    let last = play(state, 'p1', 0);
    last = play(last.state, 'p2', 0);
    while (last.state.phase === 'playing' && last.state.round === round) {
      last = act(last.state, { type: 'PASS', player: last.state.currentPlayer! });
    }
    return last;
  }

  it('gives the round to the higher score, takes a gem from the loser and moves the board to the grave', () => {
    const state = setup({ p1: [BALLISTA, VES, DETHMOLD], p2: [BOTCHLING, FIEND, FOOT_SOLDIER] });
    const p1Card = state.players.p1.hand[0]!;
    const { state: next, events } = playRound(state); // 6 x 4

    expect(next.roundHistory).toEqual([{ round: 1, winner: 'p1', scores: { p1: 6, p2: 4 } }]);
    expect(next.players.p1.health).toBe(2);
    expect(next.players.p2.health).toBe(1);
    expect(next.players.p1.rows.siege.units).toEqual([]);
    expect(next.players.p1.grave).toEqual([p1Card]);
    expect(next.round).toBe(2);
    expect(next.players.p1.passed).toBe(false);
    // The round winner starts the next one
    expect(next.currentPlayer).toBe('p1');
    expect(events.map((e) => e.type)).toEqual([
      'PLAYER_PASSED',
      'ROUND_ENDED',
      'CARD_MOVED',
      'CARD_MOVED',
      'ROUND_STARTED',
      'TURN_STARTED',
    ]);
    expect(events).toContainEqual({
      type: 'CARD_MOVED',
      cardId: p1Card,
      from: { kind: 'row', side: 'p1', row: 'siege' },
      to: { kind: 'grave', player: 'p1' },
      reason: 'roundEnd',
    });
    expectCardsConserved(next);
  });

  it('takes a gem from both players on a draw and lets the round starter start the next one', () => {
    const state = setup({ p1: [BALLISTA, VES], p2: [FIEND, BOTCHLING] });
    const { state: next } = playRound(state); // 6 x 6
    expect(next.roundHistory[0]?.winner).toBeNull();
    expect(next.players.p1.health).toBe(1);
    expect(next.players.p2.health).toBe(1);
    expect(next.currentPlayer).toBe('p1');
  });

  it('lets Nilfgaard win tied rounds', () => {
    const state = setup(
      { p1: [BALLISTA, VES], p2: [FIEND, BOTCHLING] },
      { p1: 'monsters', p2: 'nilfgaard', factions: true },
    );
    const { state: next } = playRound(state);
    expect(next.roundHistory[0]?.winner).toBe('p2');
    expect(next.players.p1.health).toBe(1);
    expect(next.players.p2.health).toBe(2);
  });

  it('keeps a tie as a tie in Nilfgaard versus Nilfgaard', () => {
    const state = setup(
      { p1: [BALLISTA, VES], p2: [FIEND, BOTCHLING] },
      { p1: 'nilfgaard', p2: 'nilfgaard', factions: true },
    );
    expect(playRound(state).state.roundHistory[0]?.winner).toBeNull();
  });

  it('ends the match when someone loses the second gem', () => {
    let state = setup({ p1: [BALLISTA, DETHMOLD, VES], p2: [FOOT_SOLDIER, BOTCHLING, FIEND] });
    state = playRound(state).state; // 6 x 1 → p1 wins
    const { state: final, events } = playRound(state); // 6 x 4 → p1 wins
    expect(final.phase).toBe('gameOver');
    expect(final.result).toBe('p1');
    expect(final.currentPlayer).toBeNull();
    expect(events.at(-1)).toEqual({ type: 'GAME_ENDED', result: 'p1' });
    // The final board stays as it was scored
    expect(computeBoard(final)).toMatchObject({ p1: { total: 6 }, p2: { total: 4 } });
    expect(getLegalActions(final, 'p1')).toEqual([]);
    expect(applyAction(final, { type: 'PASS', player: 'p1' })).toMatchObject({
      ok: false,
      error: { code: 'GAME_OVER' },
    });
  });

  it('ends the match as a draw after two tied rounds in a row', () => {
    let state = setup({ p1: [BALLISTA, DETHMOLD], p2: [FIEND, FIEND] });
    state = playRound(state).state;
    const { state: final } = playRound(state);
    expect(final.result).toBe('draw');
  });

  it('scores heroes with their printed strength', () => {
    const state = setup({ p1: [TRISS], p2: [FIEND] });
    const next = play(state, 'p1', 0).state;
    expect(computeBoard(next).p1.total).toBe(7);
  });

  it('starts the round with the opponent when the current player cannot play', () => {
    // p2 runs out of cards in round 1; in round 2 it starts (it won) but passes automatically.
    let state = setup({ p1: [FOOT_SOLDIER, VES], p2: [FIEND] });
    state = play(state, 'p1', 0).state; // p1: 1
    state = play(state, 'p2', 0).state; // p2: 6, no cards → passes
    const { state: next } = act(state, { type: 'PASS', player: 'p1' });
    expect(next.roundHistory[0]?.winner).toBe('p2');
    expect(next.players.p2.passed).toBe(true);
    expect(next.currentPlayer).toBe(opponentOf('p2'));
  });
});
