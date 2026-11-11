import type { RealtimeOptions } from '../interfaces/realtime-options.interface';

/** Injection token of the multiplayer timings. */
export const REALTIME_OPTIONS = Symbol('REALTIME_OPTIONS');

/** Multiplayer timings used in production, in milliseconds. */
export const DEFAULT_REALTIME_OPTIONS: RealtimeOptions = {
  turnTimeoutMs: 90_000,
  disconnectGraceMs: 60_000,
};

/** Messages each client may send per second, on average. */
export const RATE_LIMIT_PER_SECOND = 25;

/** Messages a client may send at once before the rate limit applies. */
export const RATE_LIMIT_BURST = 50;

/** Largest match seed (the engine seed is a uint32). */
export const MAX_MATCH_SEED = 2 ** 32 - 1;
