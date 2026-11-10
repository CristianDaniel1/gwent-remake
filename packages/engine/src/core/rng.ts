// Deterministic RNG (mulberry32).
// The state lives inside the GameState (one uint32 per stream), so the whole
// match can be reproduced from the seed: replays and multiplayer depend on it.

/** Cell holding a stream's state. May be an Immer draft. */
export type RngCell = { state: number };

export type RngStreamName = 'game' | 'deckHost' | 'deckGuest' | 'ai';
export type RngStreams = Record<RngStreamName, RngCell>;

export interface RandomSource {
  uint32(): number;
  /** [0, 1) */
  float(): number;
  /** Integer in [0, n) */
  int(n: number): number;
  coin(): boolean;
}

/** One mulberry32 step: returns the value and the next state (pure function). */
export function nextUint32(state: number): { value: number; state: number } {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: (t ^ (t >>> 14)) >>> 0, state: next };
}

/** Random source that advances the cell state on every call. */
export function randomFrom(cell: RngCell): RandomSource {
  const uint32 = () => {
    const { value, state } = nextUint32(cell.state);
    cell.state = state;
    return value;
  };
  const float = () => uint32() / 4294967296;
  return {
    uint32,
    float,
    int: (n) => Math.floor(float() * n),
    coin: () => uint32() % 2 === 0,
  };
}

/** FNV-1a of the label combined with the base seed: each stream starts in a different state. */
export function deriveSeed(base: number, label: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h ^ base) >>> 0;
}

// Fixed labels: changing them changes every seeded sequence (and breaks saved replays).
const STREAM_LABELS: Record<RngStreamName, string> = {
  game: 'game',
  deckHost: 'deck-host',
  deckGuest: 'deck-guest',
  ai: 'ai',
};

export function createRngStreams(seed: number): RngStreams {
  const base = seed >>> 0;
  const cell = (name: RngStreamName): RngCell => ({ state: deriveSeed(base, STREAM_LABELS[name]) });
  return {
    game: cell('game'),
    deckHost: cell('deckHost'),
    deckGuest: cell('deckGuest'),
    ai: cell('ai'),
  };
}

/** Shuffles a copy of the array (Fisher-Yates). */
export function shuffled<T>(items: readonly T[], rng: RandomSource): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
