import { describe, expect, it } from 'vitest';
import { allCardDefs } from '../data/catalog';
import { PREMADE_DECKS } from '../data/premade';
import { deckPool, deckStats, leadersOf, validateDeck } from './deck-validation';

describe('card catalog', () => {
  it('has all 216 cards, with id = position', () => {
    const cards = allCardDefs();
    expect(cards).toHaveLength(216);
    cards.forEach((c, i) => expect(c.id).toBe(i));
  });
});

describe('validateDeck', () => {
  it.each(PREMADE_DECKS.map((d, i) => [i, d] as const))('accepts premade deck %i', (_i, deck) => {
    expect(validateDeck(deck)).toEqual([]);
  });

  it('reports a leader from another faction, a card from another faction and too many copies', () => {
    const issues = validateDeck({
      faction: 'realms',
      leader: 56, // Nilfgaard leader
      cards: [
        [61, 1], // Nilfgaard unit
        [1, 4], // Decoy: at most 3
      ],
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'LEADER_WRONG_FACTION', cardId: 56 },
        { code: 'CARD_WRONG_FACTION', cardId: 61 },
        { code: 'TOO_MANY_COPIES', cardId: 1, count: 4, max: 3 },
        { code: 'NOT_ENOUGH_UNITS', units: 1, min: 22 },
      ]),
    );
  });

  it('reports an unknown card and more than 10 specials', () => {
    const issues = validateDeck({
      faction: 'realms',
      leader: 22,
      cards: [
        [9999, 1],
        [1, 3],
        [2, 3],
        [5, 3], // Commander's Horn
        [10, 3], // Scorch
      ],
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        { code: 'UNKNOWN_CARD', cardId: 9999 },
        expect.objectContaining({ code: 'TOO_MANY_SPECIALS' }),
      ]),
    );
  });
});

describe('deck building', () => {
  it('builds the faction pool from faction cards plus neutral/special/weather, without leaders or tokens', () => {
    const pool = deckPool('realms');
    expect(pool.every((c) => ['realms', 'neutral', 'special', 'weather'].includes(c.faction))).toBe(
      true,
    );
    expect(pool.some((c) => c.type === 'leader' || c.count === 0)).toBe(false);
    expect(pool.some((c) => c.faction === 'nilfgaard')).toBe(false);
  });

  it('gives each faction its own leaders', () => {
    expect(leadersOf('realms').map((l) => l.id)).toEqual([22, 23, 24, 25, 26]);
    expect(leadersOf('skellige')).toHaveLength(2);
  });

  it('computes the deck stats', () => {
    // Ballista (6) x1, Triss (hero 7) x1, Decoy x2
    expect(
      deckStats({
        faction: 'realms',
        leader: 22,
        cards: [
          [27, 1],
          [12, 1],
          [1, 2],
        ],
      }),
    ).toEqual({
      total: 4,
      units: 2,
      specials: 2,
      strength: 13,
      heroes: 1,
    });
  });
});
