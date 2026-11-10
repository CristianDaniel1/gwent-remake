import type { Draft } from 'immer';
import type { GameEvent } from '../model/events';
import type { GameState } from '../model/state';
import type { Task } from '../model/tasks';
import type { EngineContext } from '../mechanics/types';
import { randomFrom } from './rng';

export interface RunnerContext extends EngineContext {
  /** Moves the tasks scheduled in the current step to the top of the stack (in scheduling order). */
  flush(): void;
}

export function createContext(draft: Draft<GameState>, events: GameEvent[]): RunnerContext {
  const state = draft as GameState;
  let pending: Task[] = [];

  return {
    state,
    emit: (event) => events.push(event),
    random: (stream) => randomFrom(state.rng[stream]),
    schedule: (...tasks) => {
      pending.push(...tasks);
    },
    requestChoice: (choice) => {
      if (state.pendingChoice) throw new Error('A choice is already pending');
      state.pendingChoice = choice;
      events.push({ type: 'CHOICE_REQUESTED', choice });
    },
    flush: () => {
      for (let i = pending.length - 1; i >= 0; i--) state.stack.push(pending[i] as Task);
      pending = [];
    },
  };
}
