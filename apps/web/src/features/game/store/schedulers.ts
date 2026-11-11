import type { Step, Timer } from '../interfaces/schedulers';

/**
 * Creates a runner that plays timed steps in order and queues tasks while busy.
 *
 * @returns The sequencer controls.
 */
export const createSequencer = () => {
  let timers: Timer[] = [];
  let queue: (() => void)[] = [];

  const busy = () => !!timers.length;
  const drain = () => {
    while (!busy() && queue.length) queue.shift()?.();
  };
  const complete = (finish: () => void) => {
    timers = [];
    finish();
    drain();
  };

  return {
    busy,
    enqueue: (task: () => void) => {
      if (busy()) queue.push(task);
      else task();
    },
    play: (steps: readonly Step[], finish: () => void) => {
      if (!steps.length) return complete(finish);
      let delay = 0;
      for (const step of steps) {
        timers.push(setTimeout(step.run, delay));
        delay += step.ms;
      }
      timers.push(setTimeout(() => complete(finish), delay));
    },
    cancel: () => {
      timers.forEach(clearTimeout);
      timers = [];
      queue = [];
    },
  };
};

/**
 * Creates a buffer that releases its items together after the latest delay.
 *
 * @param release - Receives the held items.
 * @returns The buffer controls.
 */
export const createHold = <T>(release: (items: T[]) => void) => {
  let timer: Timer | null = null;
  let held: T[] = [];

  return {
    holding: () => !!timer,
    add: (items: readonly T[], delayMs: number) => {
      held = [...held, ...items];
      if (delayMs <= 0) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const items = held;
        held = [];
        release(items);
      }, delayMs);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
      held = [];
    },
  };
};

/**
 * Creates a single pending callback that is replaced when scheduled again.
 *
 * @returns The delay controls.
 */
export const createDelay = () => {
  let timer: Timer | null = null;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    run: (callback: () => void, delayMs: number) => {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        callback();
      }, delayMs);
    },
    cancel,
  };
};
