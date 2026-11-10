import type { Task } from '../model/tasks';
import { getAbility, getMechanic } from '../mechanics/registry';
import { placeNow } from './board';
import type { RunnerContext } from './context';
import { scheduleHooks } from './hooks';
import { beginRound, deal, endRound, endTurn, finishRound, startRound } from './turn-flow';
import { isInZone, locate } from './zones';

/** Safety limit against infinite loops between mechanics. */
const MAX_STEPS = 10_000;

function executeTask(ctx: RunnerContext, task: Task): void {
  const { state } = ctx;
  switch (task.type) {
    case 'HOOKS':
      scheduleHooks(ctx, task.hook);
      return;
    case 'HOOK': {
      const mechanic = getMechanic(task.source);
      if (mechanic && 'hooks' in mechanic) mechanic.hooks?.[task.hook]?.(ctx, task.owner);
      return;
    }
    case 'DEAL':
      deal(ctx);
      return;
    case 'START_ROUND':
      startRound(ctx);
      return;
    case 'BEGIN_ROUND':
      beginRound(ctx);
      return;
    case 'END_TURN':
      endTurn(ctx);
      return;
    case 'END_ROUND':
      endRound(ctx);
      return;
    case 'FINISH_ROUND':
      finishRound(ctx, task.winner);
      return;

    case 'PLACE': {
      // The card may have left its place while the task was waiting (e.g. it was already summoned).
      if (!isInZone(state, task.from, task.cardId)) return;
      placeNow(ctx, task.cardId, task.side, task.row, {
        from: task.from,
        slot: task.slot,
        reason: task.reason,
        ...(task.suppress ? { suppress: task.suppress } : {}),
      });
      return;
    }

    case 'TRIGGER': {
      const ability = getAbility(task.ability);
      const position = { cardId: task.cardId, side: task.side, row: task.row };
      if (task.event === 'leave') {
        ability?.onLeave?.(ctx, position);
        return;
      }
      // Only triggers if the card is still where it was placed.
      const where = locate(state, task.cardId);
      const onBoard =
        where &&
        (where.kind === 'row' || where.kind === 'special') &&
        where.side === task.side &&
        where.row === task.row;
      if (onBoard) ability?.onPlace?.(ctx, position);
      return;
    }

    case 'MECHANIC': {
      const handler = getMechanic(task.ref)?.tasks?.[task.name];
      if (!handler) throw new Error(`Unknown task: ${task.ref.kind}:${task.ref.id}/${task.name}`);
      handler(ctx, task.data);
      return;
    }
  }
}

/** Resolves the stack until it is empty or someone has to choose something. */
export function runStack(ctx: RunnerContext): void {
  const { state } = ctx;
  ctx.flush();
  let steps = 0;
  while (!state.pendingChoice && state.stack.length > 0) {
    if (++steps > MAX_STEPS) throw new Error('Resolution did not finish (loop between mechanics?)');
    executeTask(ctx, state.stack.pop() as Task);
    ctx.flush();
  }
}
