// Engine test utilities (not exported by the public API).
import { produce } from 'immer';
import { expect } from 'vitest';
import { allCardDefs } from '../data/catalog';
import { applyAction, type ActionResult } from '../core/apply-action';
import { createGame } from '../core/create-game';
import type { GameAction } from '../model/actions';
import { COMBAT_ROWS, type DeckList, type Faction } from '../model/card';
import type { GameEvent } from '../model/events';
import {
  cardDefId,
  cardInstanceId,
  PLAYER_IDS,
  type CardInstanceId,
  type PlayerId,
} from '../model/ids';
import type { GameState } from '../model/state';

/** Deck with every ability-free unit of the faction + neutral ones (pure rules, no effects). */
export function plainDeck(faction: Faction): DeckList {
  const defs = allCardDefs();
  const leader = defs.find((d) => d.type === 'leader' && d.faction === faction);
  if (!leader) throw new Error(`No leader for ${faction}`);
  const cards = defs
    .filter(
      (d) =>
        d.type === 'unit' &&
        !d.hero &&
        d.count > 0 &&
        d.abilities.length === 0 &&
        (d.faction === faction || d.faction === 'neutral'),
    )
    .map((d) => [d.id, d.count] as const);
  return { faction, leader: leader.id, cards };
}

export interface TestGameOptions {
  seed?: number;
  p1?: Faction;
  p2?: Faction;
}

export function newGame({ seed = 1, p1 = 'realms', p2 = 'monsters' }: TestGameOptions = {}) {
  return createGame({ seed, decks: { p1: plainDeck(p1), p2: plainDeck(p2) } });
}

/** Applies the action and fails the test if it is rejected. */
export function act(
  state: GameState,
  action: GameAction,
): { state: GameState; events: GameEvent[] } {
  const result: ActionResult = applyAction(state, action);
  if (!result.ok)
    throw new Error(`Action rejected (${result.error.code}): ${JSON.stringify(action)}`);
  return result;
}

/** Match already in round 1 (both players ended the redraw without swapping anything). */
export function startedGame(options: TestGameOptions = {}): GameState {
  let { state } = newGame(options);
  for (const player of PLAYER_IDS) state = act(state, { type: 'END_REDRAW', player }).state;
  return state;
}

/**
 * Replaces the player's hand with new cards (by CardDefId).
 * The old hand cards go to the bottom of the deck.
 */
export function withHand(state: GameState, player: PlayerId, defIds: number[]): GameState {
  return produce(state, (draft) => {
    const me = draft.players[player];
    me.deck.push(...me.hand);
    me.hand = defIds.map((defId) => {
      const id = cardInstanceId(`c${draft.nextInstanceId++}`);
      draft.cards[id] = { id, defId: cardDefId(defId), owner: player };
      return id;
    });
  });
}

/** Turns leaders off (pure rule tests: no leader, empty hand = passes automatically). */
export function withoutLeaders(state: GameState): GameState {
  return produce(state, (draft) => {
    for (const p of PLAYER_IDS) draft.players[p].leaderAvailable = false;
  });
}

/** Turns faction abilities off (pure rule tests). */
export function withoutFactionAbilities(state: GameState): GameState {
  return produce(state, (draft) => {
    draft.flags.factionAbilitiesDisabled = true;
  });
}

/** Every id present in some zone (deck, hand, grave, rows, weather, leader). */
export function idsInZones(state: GameState): CardInstanceId[] {
  const ids: CardInstanceId[] = [...state.weather];
  for (const p of PLAYER_IDS) {
    const me = state.players[p];
    ids.push(me.leader, ...me.deck, ...me.hand, ...me.grave);
    for (const row of COMBAT_ROWS) {
      ids.push(...me.rows[row].units);
      const special = me.rows[row].special;
      if (special) ids.push(special);
    }
  }
  return ids;
}

/** Each card in the match is in exactly one zone. */
export function expectCardsConserved(state: GameState): void {
  const ids = idsInZones(state);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...ids].sort()).toEqual(Object.keys(state.cards).sort());
}
