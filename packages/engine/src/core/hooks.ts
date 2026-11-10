import { PLAYER_IDS } from '../model/ids';
import { getAbility, getFaction, getMutator } from '../mechanics/registry';
import type { EngineContext, HookName } from '../mechanics/types';
import { defOf } from './zones';

/**
 * Schedules the mutator, faction and leader hooks of both players, one per task and in
 * canonical order (p1 before p2), so a choice inside a hook pauses before the next one.
 */
export function scheduleHooks(ctx: EngineContext, hook: HookName): void {
  const { state } = ctx;
  for (const owner of PLAYER_IDS) {
    for (const id of state.mutators) {
      if (getMutator(id)?.hooks?.[hook]) {
        ctx.schedule({ type: 'HOOK', hook, owner, source: { kind: 'mutator', id } });
      }
    }
    const { faction, leader, leaderDisabled } = state.players[owner];
    if (!state.flags.factionAbilitiesDisabled && getFaction(faction)?.hooks?.[hook]) {
      ctx.schedule({ type: 'HOOK', hook, owner, source: { kind: 'faction', id: faction } });
    }
    if (leaderDisabled) continue;
    for (const ability of defOf(state, leader).abilities) {
      if (getAbility(ability)?.hooks?.[hook]) {
        ctx.schedule({ type: 'HOOK', hook, owner, source: { kind: 'ability', id: ability } });
      }
    }
  }
}
