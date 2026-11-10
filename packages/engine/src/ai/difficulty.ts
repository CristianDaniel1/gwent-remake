import { applyAction } from '../core/apply-action';
import { getLegalActions } from '../core/legal-actions';
import { createRngStreams, shuffled, type RandomSource } from '../core/rng';
import { defOf } from '../core/zones';
import type { GameAction } from '../model/actions';
import { opponentOf, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { chooseAiAction } from './index';

export const AI_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];

export interface SearchOptions {
  /** Possible worlds sampled per candidate move (more = stronger and slower). */
  samples?: number;
  /** Stops early when it returns true (e.g. a time budget); at least one sample always runs. */
  shouldStop?: () => boolean;
}

/** Chance that the easy bot plays a random card instead of its planned move. */
const EASY_BLUNDER_CHANCE = 0.35;
const DEFAULT_SAMPLES = 8;
/** Safety limit for one simulated match. */
const MAX_ROLLOUT_STEPS = 400;

/**
 * Move for the given difficulty. All of them only use what the player could know:
 * the hard bot reshuffles the hidden cards for every simulation.
 */
export function chooseAiActionFor(
  difficulty: AiDifficulty,
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
  options: SearchOptions = {},
): GameAction | null {
  switch (difficulty) {
    case 'easy':
      return easyAiAction(state, player, rng);
    case 'normal':
      return chooseAiAction(state, player, rng);
    case 'hard':
      return searchAiAction(state, player, rng, options);
  }
}

const isTurnDecision = (state: GameState, player: PlayerId) =>
  state.phase === 'playing' && !state.pendingChoice && state.currentPlayer === player;

/** The rule-based bot, but now and then it plays a random card instead of the planned move. */
export function easyAiAction(
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
): GameAction | null {
  const planned = chooseAiAction(state, player, rng);
  if (!planned || !isTurnDecision(state, player)) return planned;
  if (rng.float() >= EASY_BLUNDER_CHANCE) return planned;
  const plays = getLegalActions(state, player).filter((a) => a.type === 'PLAY_CARD');
  return plays.length > 0 ? plays[rng.int(plays.length)]! : planned;
}

/**
 * One possible world from `player`'s point of view: the opponent's hand is redrawn from
 * everything the opponent could hold (hand + deck), both decks are reshuffled and the
 * random generator is reseeded. What `player` can see (board, graves, own hand) stays.
 */
export function determinize(state: GameState, player: PlayerId, rng: RandomSource): GameState {
  const opp = opponentOf(player);
  const mine = state.players[player];
  const theirs = state.players[opp];
  const pool = shuffled([...theirs.hand, ...theirs.deck], rng);
  return {
    ...state,
    players: {
      ...state.players,
      [player]: { ...mine, deck: shuffled(mine.deck, rng) },
      [opp]: {
        ...theirs,
        hand: pool.slice(0, theirs.hand.length),
        deck: pool.slice(theirs.hand.length),
      },
    },
    rng: createRngStreams(rng.int(0x7fffffff)),
  };
}

/**
 * Final outcome for `player`: 1 win, 0 draw, -1 loss, plus a small bonus for the point margin
 * of the last round (it separates moves that win anyway from moves that win by a lot).
 */
function evaluate(state: GameState, player: PlayerId): number {
  if (state.phase !== 'gameOver') return 0;
  const last = state.roundHistory.at(-1);
  const margin = last ? last.scores[player] - last.scores[opponentOf(player)] : 0;
  const bonus = Math.max(-0.1, Math.min(0.1, margin / 500));
  if (state.result === 'draw') return bonus;
  return (state.result === player ? 1 : -1) + bonus;
}

/**
 * Plays the rest of the match with the rule-based bot on both sides. Playing to the end
 * (not just the current round) matters in Gwent: winning a round with too many cards
 * usually loses the match.
 */
function rollout(state: GameState, player: PlayerId, rng: RandomSource): number {
  let current = state;
  for (let step = 0; step < MAX_ROLLOUT_STEPS && current.phase !== 'gameOver'; step++) {
    const action =
      chooseAiAction(current, player, rng) ?? chooseAiAction(current, opponentOf(player), rng);
    if (!action) break;
    const result = applyAction(current, action);
    if (!result.ok) break;
    current = result.state;
  }
  return evaluate(current, player);
}

/** Identical cards played the same way are the same move: simulate it only once. */
function distinctMoves(state: GameState, moves: GameAction[]): GameAction[] {
  const seen = new Set<string>();
  return moves.filter((move) => {
    const key =
      move.type === 'PLAY_CARD'
        ? `play:${defOf(state, move.cardId).id}:${move.row ?? ''}:${move.targetId ? defOf(state, move.targetId).id : ''}`
        : move.type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Hard bot: determinized Monte Carlo. For each possible move it samples worlds consistent
 * with what it can see, simulates the rest of the match and keeps the move with the best
 * average outcome. The same worlds are used for every move, so they are compared fairly.
 * Redraws and choices still use the rule-based bot.
 */
export function searchAiAction(
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
  { samples = DEFAULT_SAMPLES, shouldStop }: SearchOptions = {},
): GameAction | null {
  if (!isTurnDecision(state, player)) return chooseAiAction(state, player, rng);
  const moves = distinctMoves(state, getLegalActions(state, player));
  if (moves.length <= 1) return moves[0] ?? null;

  const totals = moves.map(() => 0);
  for (let sample = 0; sample < samples; sample++) {
    const world = determinize(state, player, rng);
    moves.forEach((move, i) => {
      const result = applyAction(world, move);
      if (result.ok) totals[i]! += rollout(result.state, player, rng);
    });
    if (shouldStop?.()) break;
  }
  let best = 0;
  totals.forEach((total, i) => {
    if (total > totals[best]!) best = i;
  });
  return moves[best]!;
}
