import { describe, expect, it } from 'vitest';
import { createRngStreams, deriveSeed, randomFrom, shuffled } from './rng';

// Fixed expected values: seeded sequences must never change (replays depend on them).
describe('rng', () => {
  it('produces the expected mulberry32 sequence', () => {
    const rng = randomFrom({ state: 12345 });
    expect([rng.uint32(), rng.uint32(), rng.uint32()]).toEqual([
      4207900869, 1317490944, 2079646450,
    ]);
  });

  it('derives stable stream seeds', () => {
    expect(deriveSeed(12345, 'game')).toBe(1112139582);
    expect(deriveSeed(12345, 'deck-host')).toBe(4024353392);
  });

  it('keeps streams independent', () => {
    const s = createRngStreams(42);
    const game = randomFrom(s.game);
    const result = [
      game.int(100),
      game.int(100),
      randomFrom(s.ai).coin(),
      randomFrom(s.deckGuest).int(10),
    ];
    expect(result).toEqual([48, 27, false, 6]);
  });

  it('shuffles deterministically without mutating the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const a = shuffled(input, randomFrom({ state: 7 }));
    const b = shuffled(input, randomFrom({ state: 7 }));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
