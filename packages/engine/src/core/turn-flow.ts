import { COMBAT_ROWS } from '../model/card';
import { opponentOf, PLAYER_IDS, type CardInstanceId, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { getAbility, getFaction } from '../mechanics/registry';
import type { EngineContext } from '../mechanics/types';
import { drawCards, moveCard } from './board';
import { computeBoard } from './scoring';
import { defOf, instanceOf } from './zones';

export const HAND_SIZE = 10;

export function canUseLeader(state: GameState, player: PlayerId): boolean {
  const p = state.players[player];
  if (!p.leaderAvailable || p.leaderDisabled) return false;
  return defOf(state, p.leader).abilities.every(
    (a) => getAbility(a)?.canActivate?.(state, player) ?? true,
  );
}

/** Can do something other than passing. */
export function canPlay(state: GameState, player: PlayerId): boolean {
  return state.players[player].hand.length > 0 || canUseLeader(state, player);
}

function markPassed(ctx: EngineContext, player: PlayerId, automatic: boolean) {
  ctx.state.players[player].passed = true;
  ctx.emit({ type: 'PLAYER_PASSED', player, automatic });
}

/** Coin flip (if no faction decided) and the starting hands. */
export function deal(ctx: EngineContext): void {
  const { state } = ctx;
  if (!state.firstPlayer) {
    state.firstPlayer = ctx.random('game').coin() ? 'p1' : 'p2';
    ctx.emit({ type: 'COIN_TOSSED', firstPlayer: state.firstPlayer });
  }
  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of PLAYER_IDS) drawCards(ctx, p, 1);
  }
  state.phase = 'redraw';
}

/** End of the redraw phase: once both players finish, round 1 starts. */
export function endRedraw(ctx: EngineContext, player: PlayerId): void {
  const { state } = ctx;
  state.players[player].redrawDone = true;
  ctx.emit({ type: 'REDRAW_ENDED', player });
  if (PLAYER_IDS.every((p) => state.players[p].redrawDone)) {
    state.phase = 'playing';
    state.currentPlayer = state.firstPlayer;
    ctx.schedule({ type: 'START_ROUND' });
  }
}

export function startRound(ctx: EngineContext): void {
  const { state } = ctx;
  if (!state.currentPlayer) throw new Error('startRound without a current player');
  state.firstPlayer = state.currentPlayer;
  state.round += 1;
  ctx.schedule({ type: 'HOOKS', hook: 'roundStart' }, { type: 'BEGIN_ROUND' });
}

/** After the round start effects: automatic passes and the first turn. */
export function beginRound(ctx: EngineContext): void {
  const { state } = ctx;
  for (const p of PLAYER_IDS) {
    if (!canPlay(state, p)) markPassed(ctx, p, true);
  }
  if (PLAYER_IDS.every((p) => state.players[p].passed)) {
    ctx.schedule({ type: 'END_ROUND' });
    return;
  }
  let current = state.currentPlayer as PlayerId;
  if (state.players[current].passed) current = state.currentPlayer = opponentOf(current);
  ctx.emit({ type: 'ROUND_STARTED', round: state.round, currentPlayer: current });
  ctx.emit({ type: 'TURN_STARTED', player: current });
}

/** After each move: hands over the turn or ends the round. */
export function endTurn(ctx: EngineContext): void {
  const { state } = ctx;
  const current = state.currentPlayer;
  if (!current || state.phase !== 'playing') return;

  if (!state.players[current].passed && !canPlay(state, current)) markPassed(ctx, current, true);

  if (PLAYER_IDS.every((p) => state.players[p].passed)) {
    ctx.schedule({ type: 'END_ROUND' });
    return;
  }
  const opponent = opponentOf(current);
  if (!state.players[opponent].passed) state.currentPlayer = opponent;
  ctx.emit({ type: 'TURN_STARTED', player: state.currentPlayer as PlayerId });
}

/** >0: p1 wins; <0: p2 wins; 0: draw. Includes the tie-break rule (Nilfgaard). */
function roundOutcome(state: GameState, scores: Record<PlayerId, number>): number {
  const dif = scores.p1 - scores.p2;
  if (dif !== 0) return dif;
  const winsTies = (p: PlayerId) =>
    !state.flags.factionAbilitiesDisabled &&
    (getFaction(state.players[p].faction)?.winsTies ?? false);
  const w1 = winsTies('p1');
  const w2 = winsTies('p2');
  if (w1 === w2) return 0;
  return w1 ? 1 : -1;
}

export function endRound(ctx: EngineContext): void {
  const { state } = ctx;
  const board = computeBoard(state);
  const scores = { p1: board.p1.total, p2: board.p2.total };
  const dif = roundOutcome(state, scores);
  const winner: PlayerId | null = dif > 0 ? 'p1' : dif < 0 ? 'p2' : null;
  state.roundHistory.push({ round: state.round, winner, scores });

  // The loser (or both, on a draw) loses a gem; the last gem ends the match.
  const gameOver =
    (dif <= 0 && state.players.p1.health <= 1) || (dif >= 0 && state.players.p2.health <= 1);

  if (gameOver) {
    loseGems(state, winner);
    ctx.emit({ type: 'ROUND_ENDED', round: state.round, winner, scores });
    const { p1, p2 } = state.players;
    state.result = p1.health <= 0 && p2.health <= 0 ? 'draw' : p2.health <= 0 ? 'p1' : 'p2';
    state.phase = 'gameOver';
    state.currentPlayer = null;
    state.stack = [];
    ctx.emit({ type: 'GAME_ENDED', result: state.result });
    return;
  }
  // Round end effects only prepare the next round (after the last one, the board stays as scored).
  ctx.schedule({ type: 'HOOKS', hook: 'roundEnd' }, { type: 'FINISH_ROUND', winner });
}

function loseGems(state: GameState, winner: PlayerId | null) {
  for (const p of PLAYER_IDS) {
    const player = state.players[p];
    if (winner !== p) player.health = Math.max(0, player.health - 1);
    player.passed = false;
  }
}

export function finishRound(ctx: EngineContext, winner: PlayerId | null): void {
  const { state } = ctx;
  loseGems(state, winner);
  const last = state.roundHistory.at(-1);
  if (last) ctx.emit({ type: 'ROUND_ENDED', round: last.round, winner, scores: last.scores });

  clearBoard(ctx);
  state.currentPlayer = winner ?? state.firstPlayer;
  // Leave effects from the round end (e.g. Avenger) were scheduled earlier and run first.
  ctx.schedule({ type: 'START_ROUND' });
}

/** Moves weather and row cards to the grave (except the ones marked to stay). */
function clearBoard(ctx: EngineContext): void {
  const { state } = ctx;
  for (const id of [...state.weather].reverse().filter((w) => !state.cards[w]?.noRemove)) {
    moveCard(ctx, id, { kind: 'grave', player: instanceOf(state, id).owner }, 'roundEnd');
  }
  for (const side of PLAYER_IDS) {
    for (const rowName of COMBAT_ROWS) {
      const row = state.players[side].rows[rowName];
      const leaving: CardInstanceId[] = row.units.filter((id) => !state.cards[id]?.noRemove);
      if (row.special) leaving.push(row.special);
      for (const id of leaving) {
        moveCard(ctx, id, { kind: 'grave', player: instanceOf(state, id).owner }, 'roundEnd');
      }
    }
  }
}
