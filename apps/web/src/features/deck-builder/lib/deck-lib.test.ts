import { findCardDef, type DeckList } from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { addCopy, copiesLeft, removeCopy } from './deck-edit';
import { deckToJson, parseDeckFile } from './deck-file';
import { matchesFilter } from './filters';

const empty: DeckList = { faction: 'realms', leader: 22, cards: [] };
const DECOY = 1;
const BALLISTA = 27;
const NILFGAARD_UNIT = 61;

describe('deck editing', () => {
  it('adds copies up to the card limit, keeping the id order', () => {
    let deck = addCopy(empty, BALLISTA);
    for (let index = 0; index < 5; index++) deck = addCopy(deck, DECOY);
    expect(deck.cards).toEqual([
      [DECOY, 3],
      [BALLISTA, 1],
    ]);
    expect(copiesLeft(deck, DECOY)).toBe(0);
  });

  it('does not add a card from another faction', () => {
    expect(addCopy(empty, NILFGAARD_UNIT)).toBe(empty);
  });

  it('removes copies and drops the entry when it reaches zero', () => {
    const deck = addCopy(addCopy(empty, DECOY), DECOY);
    expect(removeCopy(deck, DECOY).cards).toEqual([[DECOY, 1]]);
    expect(removeCopy(removeCopy(deck, DECOY), DECOY).cards).toEqual([]);
    expect(removeCopy(empty, DECOY)).toBe(empty);
  });
});

describe('deck file', () => {
  it('round-trips the deck file format', () => {
    const deck: DeckList = {
      faction: 'realms',
      leader: 24,
      cards: [
        [5, 1],
        [1, 3],
      ],
    };
    expect(parseDeckFile(deckToJson(deck))).toEqual({ ok: true, deck });
  });

  it('tells invalid JSON apart from a wrong format', () => {
    expect(parseDeckFile('{ not json')).toEqual({ ok: false, error: 'notParsable' });
    expect(parseDeckFile('{"faction":"elves","leader":1,"cards":[]}')).toEqual({
      ok: false,
      error: 'badFormat',
    });
  });
});

describe('filters', () => {
  it('shows agile cards in both close and ranged', () => {
    const harpy = findCardDef(103)!;
    expect(matchesFilter(harpy, 'close')).toBe(true);
    expect(matchesFilter(harpy, 'ranged')).toBe(true);
    expect(matchesFilter(harpy, 'siege')).toBe(false);
  });
});
