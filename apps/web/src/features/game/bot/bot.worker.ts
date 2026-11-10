/// <reference lib="webworker" />
import { chooseAiActionFor, randomFrom } from '@gwent/engine';
import type { BotRequest, BotResponse } from './protocol';

/** Upper bound of simulated worlds per move; the time budget usually stops earlier. */
const MAX_SAMPLES = 64;

// The hard bot thinks here, off the main thread, so the board keeps animating.
self.onmessage = (event: MessageEvent<BotRequest>) => {
  const { id, state, player, seed, budgetMs } = event.data;
  const started = performance.now();
  const action = chooseAiActionFor('hard', state, player, randomFrom({ state: seed }), {
    samples: MAX_SAMPLES,
    shouldStop: () => performance.now() - started > budgetMs,
  });
  const response: BotResponse = { id, action };
  self.postMessage(response);
};
