import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limiter';

const PER_SECOND = 2;
const BURST = 3;

/**
 * Builds a limiter with a clock the test controls.
 *
 * @returns The limiter and a function that moves the clock forward.
 */
const createLimiter = () => {
  let time = 0;
  const limiter = new RateLimiter(PER_SECOND, BURST, () => time);
  const advance = (milliseconds: number) => {
    time += milliseconds;
  };
  return { limiter, advance };
};

/**
 * Takes several tokens in a row.
 *
 * @param limiter - Limiter to use.
 * @param count - How many tokens to take.
 * @returns Whether each take was allowed.
 */
const takeMany = (limiter: RateLimiter, count: number) =>
  Array.from({ length: count }, () => limiter.take('client'));

describe('RateLimiter', () => {
  it('allows a burst and then blocks', () => {
    const { limiter } = createLimiter();
    expect(takeMany(limiter, BURST + 1)).toEqual([true, true, true, false]);
  });

  it('refills the tokens over time', () => {
    const { limiter, advance } = createLimiter();
    takeMany(limiter, BURST);
    advance(500);
    expect(takeMany(limiter, 2)).toEqual([true, false]);
  });

  it('never refills above the burst', () => {
    const { limiter, advance } = createLimiter();
    advance(60_000);
    expect(takeMany(limiter, BURST + 1).filter(Boolean)).toHaveLength(BURST);
  });

  it('keeps a separate bucket per client and forgets a client that left', () => {
    const { limiter } = createLimiter();
    takeMany(limiter, BURST);
    expect(limiter.take('other-client')).toBe(true);
    limiter.forget('client');
    expect(limiter.take('client')).toBe(true);
  });
});
