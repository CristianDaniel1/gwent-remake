/** Multiplayer timings (injectable so tests do not wait for minutes). */
export interface RealtimeOptions {
  /** Time to act before the automatic move (redraw, choice or pass). */
  turnTimeoutMs: number;
  /** Time to reconnect before the room is closed. */
  disconnectGraceMs: number;
}

export const REALTIME_OPTIONS = Symbol('REALTIME_OPTIONS');

export const DEFAULT_REALTIME_OPTIONS: RealtimeOptions = {
  turnTimeoutMs: 90_000,
  disconnectGraceMs: 60_000,
};
