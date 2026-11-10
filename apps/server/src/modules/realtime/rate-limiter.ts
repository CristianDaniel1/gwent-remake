/**
 * Token bucket per client: up to `burst` messages at once, refilling `perSecond` per second
 * (by default 25/s with bursts of 50).
 */
export class RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly perSecond = 25,
    private readonly burst = 50,
    private readonly now: () => number = Date.now,
  ) {}

  /** Takes a token; false = over the limit. */
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

  forget(key: string): void {
    this.buckets.delete(key);
  }
}
