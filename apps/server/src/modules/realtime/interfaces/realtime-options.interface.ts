/** Multiplayer timings (injectable so tests do not wait for minutes). */
export interface RealtimeOptions {
  /** Time to act before the automatic move (redraw, choice or pass), in milliseconds. */
  turnTimeoutMs: number;
  /** Time to reconnect before the room is closed, in milliseconds. */
  disconnectGraceMs: number;
}
