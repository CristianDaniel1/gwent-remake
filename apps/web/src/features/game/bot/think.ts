import {
  chooseAiActionFor,
  randomFrom,
  type AiDifficulty,
  type GameAction,
  type GameState,
  type PlayerId,
  type RandomSource,
} from '@gwent/engine';
import { reportError } from '@/shared/lib/report-error';
import { FALLBACK_SAMPLES, HARD_BUDGET_MS } from '../constants/bot';
import type { BotRequest, BotResponse, PendingThought } from '../interfaces/bot';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, PendingThought>();

const thinkOnMainThread = (state: GameState, player: PlayerId, seed: number) =>
  chooseAiActionFor('hard', state, player, randomFrom({ state: seed }), {
    samples: FALLBACK_SAMPLES,
  });

const answer = (event: MessageEvent<BotResponse>) => {
  pending.get(event.data.id)?.resolve(event.data.action);
  pending.delete(event.data.id);
};

const recoverFromWorkerError = (event: ErrorEvent) => {
  reportError('bot worker', event.error ?? event.message);
  worker?.terminate();
  worker = null;
  for (const thought of pending.values()) thought.resolve(thought.fallback());
  pending.clear();
};

const getWorker = (): Worker | null => {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = answer;
    worker.onerror = recoverFromWorkerError;
  } catch (error) {
    reportError('bot worker: start', error);
    worker = null;
  }
  return worker;
};

const thinkInWorker = (
  target: Worker,
  state: GameState,
  player: PlayerId,
  seed: number,
): Promise<GameAction | null> => {
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, { resolve, fallback: () => thinkOnMainThread(state, player, seed) });
    const request: BotRequest = { id, state, player, seed, budgetMs: HARD_BUDGET_MS };
    target.postMessage(request);
  });
};

/**
 * Decides the computer's next action.
 *
 * @param difficulty - Bot difficulty.
 * @param state - Current game state.
 * @param player - Player the bot controls.
 * @param random - Random source of the bot.
 * @returns The chosen action, or null when there is nothing to do.
 */
export const thinkBotMove = async (
  difficulty: AiDifficulty,
  state: GameState,
  player: PlayerId,
  random: RandomSource,
): Promise<GameAction | null> => {
  if (difficulty !== 'hard') return chooseAiActionFor(difficulty, state, player, random);
  const seed = random.int(0x7fffffff);
  const target = getWorker();
  if (!target) return thinkOnMainThread(state, player, seed);
  return thinkInWorker(target, state, player, seed);
};
