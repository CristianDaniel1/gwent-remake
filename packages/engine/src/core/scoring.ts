import { isDraft } from 'immer';
import { COMBAT_ROWS, type CombatRow } from '../model/card';
import { PLAYER_IDS, type CardInstanceId, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { getAbility } from '../mechanics/registry';
import type { PowerModifier, RowModifier, RowRef } from '../mechanics/types';
import { defOf, instanceOf } from './zones';

export interface CardPower {
  id: CardInstanceId;
  base: number;
  power: number;
}

export interface RowScore {
  total: number;
  /** Current strength of each card in the row, in row order. */
  cards: CardPower[];
}

export interface SideScore {
  rows: Record<CombatRow, RowScore>;
  total: number;
}

export type BoardScore = Record<PlayerId, SideScore>;

const rowKey = (side: PlayerId, row: CombatRow) => `${side}:${row}`;

/** Collects the modifiers each card on the board applies, grouped by row. */
function collectModifiers(state: GameState): Map<string, PowerModifier[]> {
  const byRow = new Map<string, PowerModifier[]>();
  const add = (mods: RowModifier[]) => {
    for (const { side, row, modifier } of mods) {
      const key = rowKey(side, row);
      byRow.set(key, [...(byRow.get(key) ?? []), modifier]);
    }
  };
  const fromCard = (id: CardInstanceId, location: RowRef | 'weather') => {
    for (const ability of defOf(state, id).abilities) {
      const mods = getAbility(ability)?.modifiers?.(instanceOf(state, id), location, state);
      if (mods) add(mods);
    }
  };

  for (const side of PLAYER_IDS) {
    for (const row of COMBAT_ROWS) {
      const { units, special } = state.players[side].rows[row];
      for (const id of special ? [...units, special] : units) fromCard(id, { side, row });
    }
  }
  for (const id of state.weather) fromCard(id, 'weather');
  return byRow;
}

function cardPower(
  state: GameState,
  id: CardInstanceId,
  modifiers: readonly PowerModifier[],
): CardPower {
  const card = instanceOf(state, id);
  const def = defOf(state, id);
  const base = def.strength;
  // Heroes and non-unit cards (Decoy) ignore every effect.
  if (def.type !== 'unit' || def.hero) return { id, base, power: base };

  const seenKeys = new Set<string>();
  const applicable = modifiers
    .filter((m) => m.appliesTo?.(card, def) ?? true)
    .filter((m) => {
      if (m.key === undefined) return true;
      if (seenKeys.has(m.key)) return false;
      seenKeys.add(m.key);
      return true;
    })
    .sort((a, b) => a.stage - b.stage);

  // A permanent bonus is added before every other effect (weather still sets the card to 1)
  const boosted = base + (card.boost ?? 0);
  const power = applicable.reduce((p, m) => m.apply(p, card, def), boosted);
  return { id, base, power };
}

/**
 * Board score cached per state. Finished states are immutable, so the result never
 * goes stale; Immer drafts (mutable, in the middle of an action) are not cached.
 */
const cache = new WeakMap<GameState, BoardScore>();

/** Strength of each card and totals per row/player. Derived from the state; nothing is stored in it. */
export function computeBoard(state: GameState): BoardScore {
  if (isDraft(state)) return calculateBoard(state);
  let score = cache.get(state);
  if (!score) {
    score = calculateBoard(state);
    cache.set(state, score);
  }
  return score;
}

function calculateBoard(state: GameState): BoardScore {
  const modifiers = collectModifiers(state);
  const score = {} as BoardScore;

  for (const side of PLAYER_IDS) {
    const rows = {} as Record<CombatRow, RowScore>;
    let total = 0;
    for (const row of COMBAT_ROWS) {
      const mods = modifiers.get(rowKey(side, row)) ?? [];
      const cards = state.players[side].rows[row].units.map((id) => cardPower(state, id, mods));
      const rowTotal = cards.reduce((sum, c) => sum + c.power, 0);
      rows[row] = { total: rowTotal, cards };
      total += rowTotal;
    }
    score[side] = { rows, total };
  }
  return score;
}
