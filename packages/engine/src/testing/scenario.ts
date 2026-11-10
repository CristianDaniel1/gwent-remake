// Builds test scenarios with specific cards in each zone.
import { produce } from 'immer';
import { getCardDef } from '../data/catalog';
import { createGame } from '../core/create-game';
import { getAbility } from '../mechanics/registry';
import { COMBAT_ROWS, type CombatRow, type Faction } from '../model/card';
import {
  cardDefId,
  cardInstanceId,
  PLAYER_IDS,
  type CardInstanceId,
  type PlayerId,
} from '../model/ids';
import type { GameFlags, GameState } from '../model/state';
import { plainDeck } from './builders';

export interface SideSpec {
  faction?: Faction;
  /** Leader CardDefId. Without a leader, the leader cannot be activated. */
  leader?: number;
  hand?: number[];
  /** Top of the deck = first item. */
  deck?: number[];
  grave?: number[];
  close?: number[];
  ranged?: number[];
  siege?: number[];
  special?: Partial<Record<CombatRow, number>>;
  /** Remaining gems (default 2). */
  health?: number;
}

export interface ScenarioSpec {
  p1?: SideSpec;
  p2?: SideSpec;
  weather?: number[];
  /** Whose turn it is (default: p1). */
  current?: PlayerId;
  /** Faction abilities on (default: no, to isolate what is being tested). */
  factions?: boolean;
  flags?: Partial<GameFlags>;
  round?: number;
  /** Match rules (setup effects are not applied: only hooks and passive rules). */
  mutators?: string[];
}

/** Match in progress with exactly the requested cards in each zone. */
export function scenario(spec: ScenarioSpec): GameState {
  const base = createGame({
    seed: 1,
    decks: {
      p1: plainDeck(spec.p1?.faction ?? 'realms'),
      p2: plainDeck(spec.p2?.faction ?? 'monsters'),
    },
  }).state;

  return produce(base, (draft) => {
    let next = 0;
    draft.cards = {};
    const spawn = (defId: number, owner: PlayerId): CardInstanceId => {
      getCardDef(cardDefId(defId));
      const id = cardInstanceId(`c${next++}`);
      draft.cards[id] = { id, defId: cardDefId(defId), owner };
      return id;
    };

    for (const p of PLAYER_IDS) {
      const side = spec[p] ?? {};
      const me = draft.players[p];
      me.faction = side.faction ?? me.faction;
      const leaderDef = side.leader ?? (p === 'p1' ? 22 : 93);
      me.leader = spawn(leaderDef, p);
      me.leaderAvailable =
        side.leader !== undefined &&
        getCardDef(cardDefId(leaderDef)).abilities.some((a) => getAbility(a)?.onActivate);
      me.hand = (side.hand ?? []).map((d) => spawn(d, p));
      me.deck = (side.deck ?? []).map((d) => spawn(d, p));
      me.grave = (side.grave ?? []).map((d) => spawn(d, p));
      for (const row of COMBAT_ROWS) {
        me.rows[row].units = (side[row] ?? []).map((d) => spawn(d, p));
        const special = side.special?.[row];
        me.rows[row].special = special === undefined ? null : spawn(special, p);
      }
      me.redrawDone = true;
      me.passed = false;
      me.health = side.health ?? 2;
    }
    draft.weather = (spec.weather ?? []).map((d) => spawn(d, 'p1'));
    draft.phase = 'playing';
    draft.round = spec.round ?? 1;
    draft.mutators = spec.mutators ?? [];
    draft.currentPlayer = spec.current ?? 'p1';
    draft.firstPlayer = draft.currentPlayer;
    draft.flags = {
      doubleSpyPower: false,
      randomRespawn: false,
      factionAbilitiesDisabled: !spec.factions,
      ...spec.flags,
    };
    draft.pendingChoice = null;
    draft.stack = [];
    draft.nextInstanceId = next;
  });
}

/** Id of the n-th instance (in creation order) of a card. */
export function cardOf(state: GameState, defId: number, n = 0): CardInstanceId {
  const matches = Object.values(state.cards).filter((c) => c.defId === defId);
  const card = matches[n];
  if (!card) throw new Error(`Card ${defId} (#${n}) is not in the match`);
  return card.id;
}

/** DefIds of the cards in a list of ids (to compare zones in tests). */
export function defIds(state: GameState, ids: readonly CardInstanceId[]): number[] {
  return ids.map((id) => state.cards[id]?.defId ?? -1);
}
