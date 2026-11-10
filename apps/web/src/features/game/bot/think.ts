import {
  chooseAiActionFor,
  randomFrom,
  type AiDifficulty,
  type GameAction,
  type GameState,
  type PlayerId,
  type RandomSource,
} from '@gwent/engine';
import type { BotRequest, BotResponse } from './protocol';

/** Thinking time of the hard bot per move. */
export const HARD_BUDGET_MS = 1200;
/** Samples when there is no worker (tests, old browsers): weaker but still a search. */
const FALLBACK_SAMPLES = 4;

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, (action: GameAction | null) => void>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!worker) {
    worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<BotResponse>) => {
      waiting.get(event.data.id)?.(event.data.action);
      waiting.delete(event.data.id);
    };
  }
  return worker;
}

/**
 * The computer's move for the chosen difficulty. Easy and normal answer right away;
 * the hard bot searches in a Web Worker (or on the main thread, briefly, without one).
 */
export function thinkBotMove(
  difficulty: AiDifficulty,
  state: GameState,
  player: PlayerId,
  rng: RandomSource,
): Promise<GameAction | null> {
  if (difficulty !== 'hard')
    return Promise.resolve(chooseAiActionFor(difficulty, state, player, rng));
  const seed = rng.int(0x7fffffff);
  const target = getWorker();
  if (!target) {
    return Promise.resolve(
      chooseAiActionFor('hard', state, player, randomFrom({ state: seed }), {
        samples: FALLBACK_SAMPLES,
      }),
    );
  }
  const id = ++nextId;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    const request: BotRequest = { id, state, player, seed, budgetMs: HARD_BUDGET_MS };
    target.postMessage(request);
  });
}
