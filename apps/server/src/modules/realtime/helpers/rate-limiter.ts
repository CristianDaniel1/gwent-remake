import { RATE_LIMIT_BURST, RATE_LIMIT_PER_SECOND } from '../constants/realtime.constants';

/** Token bucket per client: up to `burst` messages at once, refilling `perSecond` per second. */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly perSecond = RATE_LIMIT_PER_SECOND,
    private readonly burst = RATE_LIMIT_BURST,
    private readonly now: () => number = Date.now,
  ) {}

  /**
   * Takes a token from the client's bucket.
   *
   * @param key - Client id.
   * @returns False when the client is over the limit.
   */
  take(key: string): boolean {
    const time = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.burst, updatedAt: time };
    bucket.tokens = Math.min(
      this.burst,
      bucket.tokens + ((time - bucket.updatedAt) / 1000) * this.perSecond,
    );
    bucket.updatedAt = time;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return allowed;
  }

  /**
   * Drops the bucket of a client that left.
   *
   * @param key - Client id.
   */
  forget(key: string): void {
    this.buckets.delete(key);
  }
}
