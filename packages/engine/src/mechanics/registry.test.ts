import { describe, expect, it } from 'vitest';
import { allCardDefs } from '../data/catalog';
import { allAbilityIds } from './registry';

describe('mechanics registry', () => {
  it('has a registered definition for every ability used by the cards', () => {
    const registered = new Set(allAbilityIds());
    const used = new Set(allCardDefs().flatMap((c) => c.abilities));
    expect([...used].filter((a) => !registered.has(a))).toEqual([]);
  });
});
