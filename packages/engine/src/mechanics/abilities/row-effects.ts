// Passive row effects: Horn, Morale, Tight Bond and Hero.
import { placeNow, spawnCard } from '../../core/board';
import { defOf, hasAbility } from '../../core/zones';
import { COMBAT_ROWS, type CombatRow } from '../../model/card';
import type { PlayerId } from '../../model/ids';
import type { GameState } from '../../model/state';
import { announce, announceOnPlace } from '../helpers';
import {
  POWER_STAGE,
  type AbilityDefinition,
  type EngineContext,
  type SpecialPlay,
} from '../types';

const COMMANDERS_HORN = 5;

/** Player rows with a free special slot (Horn, Mardroeme). */
export const specialSlotPlay: SpecialPlay = {
  options: (state, player) =>
    COMBAT_ROWS.filter((row) => state.players[player].rows[row].special === null).map((row) => ({
      row,
    })),
  resolve: (ctx, player, cardId, { row }) => {
    if (!row) throw new Error('Special slot card without a row');
    ctx.schedule({
      type: 'PLACE',
      cardId,
      side: player,
      row,
      slot: 'special',
      from: { kind: 'hand', player },
      reason: 'play',
    });
  },
};

/** Leader horn: a temporary Horn in the row slot (if it is free). */
export function leaderHorn(ctx: EngineContext, owner: PlayerId, row: CombatRow): void {
  if (ctx.state.players[owner].rows[row].special !== null) return;
  const horn = spawnCard(ctx.state, COMMANDERS_HORN, owner, { token: true });
  placeNow(ctx, horn, owner, row, { slot: 'special', reason: 'summon' });
}

/** Doubles the strength of the units in the row (not the card itself). Several horns do not stack. */
export const horn: AbilityDefinition = {
  id: 'horn',
  play: specialSlotPlay,
  modifiers: (source, location) =>
    location === 'weather'
      ? []
      : [
          {
            ...location,
            modifier: {
              stage: POWER_STAGE.horn,
              key: 'horn',
              appliesTo: (target) => target.id !== source.id,
              apply: (power) => power * 2,
            },
          },
        ],
  onPlace: announceOnPlace('horn'),
};

/** +1 for the other units in the row. */
export const morale: AbilityDefinition = {
  id: 'morale',
  modifiers: (source, location) =>
    location === 'weather'
      ? []
      : [
          {
            ...location,
            modifier: {
              stage: POWER_STAGE.morale,
              appliesTo: (target) => target.id !== source.id,
              apply: (power) => power + 1,
            },
          },
        ],
  onPlace: announceOnPlace('morale'),
};

function bondCount(state: GameState, side: PlayerId, row: CombatRow, name: string): number {
  return state.players[side].rows[row].units.filter(
    (id) => defOf(state, id).name === name && hasAbility(state, id, 'bond'),
  ).length;
}

/** Bond cards with the same name in the row: strength multiplied by their count. */
export const bond: AbilityDefinition = {
  id: 'bond',
  modifiers: (source, location, state) => {
    if (location === 'weather') return [];
    const name = defOf(state, source.id).name;
    const count = bondCount(state, location.side, location.row, name);
    if (count < 2) return [];
    return [
      {
        ...location,
        modifier: {
          stage: POWER_STAGE.bond,
          key: `bond:${name}`,
          appliesTo: (_target, def) => def.name === name,
          apply: (power) => power * count,
        },
      },
    ];
  },
  onPlace: (ctx, position) => {
    const name = defOf(ctx.state, position.cardId).name;
    if (bondCount(ctx.state, position.side, position.row, name) > 1)
      announce(ctx, 'bond', position);
  },
};

/** Heroes ignore effects: handled in the strength calculation (core/scoring). */
export const hero: AbilityDefinition = { id: 'hero' };

/** Agile chooses the row when played: handled in core/play. */
export const agile: AbilityDefinition = { id: 'agile' };

export const rowEffectAbilities = [horn, morale, bond, hero, agile];
