/// <reference lib="webworker" />
import { chooseAiActionFor, randomFrom } from '@gwent/engine';
import type { BotResponse } from '../interfaces/bot';
import type { BotRequest } from '../interfaces/bot';
import { MAX_SAMPLES } from '../constants/bot';

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
