import { allCardDefs, findCardDef } from '../data/catalog';
import type { CardDef, DeckList, Faction } from '../model/card';

export const DECK_RULES = {
  minUnits: 22,
  maxSpecials: 10,
} as const;

export type DeckIssue =
  | { code: 'UNKNOWN_LEADER'; cardId: number }
  | { code: 'LEADER_WRONG_FACTION'; cardId: number }
  | { code: 'UNKNOWN_CARD'; cardId: number }
  | { code: 'CARD_WRONG_FACTION'; cardId: number }
  | { code: 'INVALID_COUNT'; cardId: number; count: number }
  | { code: 'TOO_MANY_COPIES'; cardId: number; count: number; max: number }
  | { code: 'NOT_ENOUGH_UNITS'; units: number; min: number }
  | { code: 'TOO_MANY_SPECIALS'; specials: number; max: number };

const SHARED_FACTIONS: readonly string[] = ['neutral', 'special', 'weather'];

/** Can the card go into a deck of this faction (ignoring the copy limit)? */
export function allowedInFaction(def: CardDef, faction: Faction): boolean {
  return def.faction === faction || SHARED_FACTIONS.includes(def.faction);
}

/** Cards that can be put in a deck of the faction (no leaders or tokens). */
export function deckPool(faction: Faction): CardDef[] {
  return allCardDefs().filter(
    (def) => def.type !== 'leader' && def.count > 0 && allowedInFaction(def, faction),
  );
}

export function leadersOf(faction: Faction): CardDef[] {
  return allCardDefs().filter((def) => def.type === 'leader' && def.faction === faction);
}

/** How many copies of the card the deck has. */
export function copiesInDeck(deck: DeckList, cardId: number): number {
  return deck.cards.reduce((sum, [id, count]) => (id === cardId ? sum + count : sum), 0);
}

export interface DeckStats {
  total: number;
  units: number;
  specials: number;
  /** Total strength of the units (heroes included). */
  strength: number;
  heroes: number;
}

/** Numbers shown in the deck builder (unknown cards are ignored). */
export function deckStats(deck: DeckList): DeckStats {
  const stats: DeckStats = { total: 0, units: 0, specials: 0, strength: 0, heroes: 0 };
  for (const [cardId, count] of deck.cards) {
    const def = findCardDef(cardId);
    if (!def || def.type === 'leader') continue;
    stats.total += count;
    if (def.type === 'unit') {
      stats.units += count;
      stats.strength += def.strength * count;
      if (def.hero) stats.heroes += count;
    } else {
      stats.specials += count;
    }
  }
  return stats;
}

/** Deck building rules. Empty list = valid deck. */
export function validateDeck(deck: DeckList): DeckIssue[] {
  const issues: DeckIssue[] = [];

  const leader = findCardDef(deck.leader);
  if (!leader || leader.type !== 'leader') {
    issues.push({ code: 'UNKNOWN_LEADER', cardId: deck.leader });
  } else if (leader.faction !== deck.faction) {
    issues.push({ code: 'LEADER_WRONG_FACTION', cardId: deck.leader });
  }

  const totals = new Map<number, number>();
  for (const [cardId, count] of deck.cards) {
    if (!Number.isInteger(count) || count < 1) {
      issues.push({ code: 'INVALID_COUNT', cardId, count });
      continue;
    }
    totals.set(cardId, (totals.get(cardId) ?? 0) + count);
  }

  for (const [cardId, count] of totals) {
    const def = findCardDef(cardId);
    if (!def || def.type === 'leader') {
      issues.push({ code: 'UNKNOWN_CARD', cardId });
      continue;
    }
    if (!allowedInFaction(def, deck.faction)) issues.push({ code: 'CARD_WRONG_FACTION', cardId });
    if (count > def.count) issues.push({ code: 'TOO_MANY_COPIES', cardId, count, max: def.count });
  }

  const { units, specials } = deckStats(deck);
  if (units < DECK_RULES.minUnits) {
    issues.push({ code: 'NOT_ENOUGH_UNITS', units, min: DECK_RULES.minUnits });
  }
  if (specials > DECK_RULES.maxSpecials) {
    issues.push({ code: 'TOO_MANY_SPECIALS', specials, max: DECK_RULES.maxSpecials });
  }

  return issues;
}
