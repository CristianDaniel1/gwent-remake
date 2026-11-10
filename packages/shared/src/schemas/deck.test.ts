import { describe, expect, it } from 'vitest';
import { DeckSchema } from './deck';

describe('DeckSchema', () => {
  it('accepts a premade deck', () => {
    const json = '{"faction":"realms","leader":24,"cards":[[5,1],[1,3],[2,1]]}';
    expect(DeckSchema.safeParse(JSON.parse(json)).success).toBe(true);
  });

  it('rejects an unknown faction and a zero count', () => {
    expect(DeckSchema.safeParse({ faction: 'elves', leader: 1, cards: [] }).success).toBe(false);
    expect(DeckSchema.safeParse({ faction: 'realms', leader: 1, cards: [[1, 0]] }).success).toBe(
      false,
    );
  });
});
