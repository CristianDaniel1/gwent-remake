import type { AbilityId, Faction } from '../model/card';
import type { MechanicRef } from '../model/tasks';
import { removalAbilities } from './abilities/removal';
import { rowEffectAbilities } from './abilities/row-effects';
import { unitEffectAbilities } from './abilities/unit-effects';
import { weatherAbilities } from './abilities/weather';
import { placement } from './core-mechanics';
import { builtinMutators } from './mutators';
import { monsters } from './factions/monsters';
import { nilfgaard } from './factions/nilfgaard';
import { realms } from './factions/realms';
import { scoiatael } from './factions/scoiatael';
import { skellige } from './factions/skellige';
import {
  eredinLeaders,
  francescaLeaders,
  skelligeLeaders,
} from './leaders/monsters-scoiatael-skellige';
import { emhyrLeaders, foltestLeaders } from './leaders/realms-nilfgaard';
import type {
  AbilityDefinition,
  CoreMechanic,
  FactionDefinition,
  MutatorDefinition,
} from './types';

// Built-in mechanics. A new mechanic = an object in one of these files (or a new file) + adding it to the list.
const BUILTIN_ABILITIES: AbilityDefinition[] = [
  ...weatherAbilities,
  ...rowEffectAbilities,
  ...unitEffectAbilities,
  ...removalAbilities,
  ...foltestLeaders,
  ...emhyrLeaders,
  ...eredinLeaders,
  ...francescaLeaders,
  ...skelligeLeaders,
];
const BUILTIN_FACTIONS: FactionDefinition[] = [realms, nilfgaard, monsters, scoiatael, skellige];
const CORE_MECHANICS: CoreMechanic[] = [placement];

const abilities = new Map<AbilityId, AbilityDefinition>(BUILTIN_ABILITIES.map((a) => [a.id, a]));
const factions = new Map<Faction, FactionDefinition>(BUILTIN_FACTIONS.map((f) => [f.id, f]));
const core = new Map<string, CoreMechanic>(CORE_MECHANICS.map((m) => [m.id, m]));
const mutators = new Map<string, MutatorDefinition>(builtinMutators.map((m) => [m.id, m]));

export function getMutator(id: string): MutatorDefinition | undefined {
  return mutators.get(id);
}

/** Every available mutator id (built-in and registered). */
export function allMutatorIds(): string[] {
  return [...mutators.keys()];
}

/** Registers (or replaces) a mutator at runtime; returns a function that undoes it. */
export function registerMutator(def: MutatorDefinition): () => void {
  const previous = mutators.get(def.id);
  mutators.set(def.id, def);
  return () => {
    if (previous) mutators.set(def.id, previous);
    else mutators.delete(def.id);
  };
}

export function getAbility(id: AbilityId): AbilityDefinition | undefined {
  return abilities.get(id);
}

export function getFaction(id: Faction): FactionDefinition | undefined {
  return factions.get(id);
}

export function allAbilityIds(): AbilityId[] {
  return [...abilities.keys()];
}

/** Resolves the mechanic that owns a scheduled task/choice. */
export function getMechanic(
  ref: MechanicRef,
): AbilityDefinition | FactionDefinition | CoreMechanic | MutatorDefinition | undefined {
  switch (ref.kind) {
    case 'ability':
      return abilities.get(ref.id);
    case 'faction':
      return factions.get(ref.id as Faction);
    case 'core':
      return core.get(ref.id);
    case 'mutator':
      return mutators.get(ref.id);
  }
}

/**
 * Registers (or replaces) an ability at runtime.
 * Useful for extensions and tests; returns a function that undoes the registration.
 */
export function registerAbility(def: AbilityDefinition): () => void {
  const previous = abilities.get(def.id);
  abilities.set(def.id, def);
  return () => {
    if (previous) abilities.set(def.id, previous);
    else abilities.delete(def.id);
  };
}

export function registerFaction(def: FactionDefinition): () => void {
  const previous = factions.get(def.id);
  factions.set(def.id, def);
  return () => {
    if (previous) factions.set(def.id, previous);
    else factions.delete(def.id);
  };
}
