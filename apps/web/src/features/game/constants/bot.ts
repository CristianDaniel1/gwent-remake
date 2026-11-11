/** Pause before the computer acts, in milliseconds. */
export const BOT_DELAY_MS = 900;

/** Pause before the hard computer starts thinking, in milliseconds. */
export const HARD_DELAY_MS = 300;

/** Thinking time of the hard computer per move, in milliseconds. */
export const HARD_BUDGET_MS = 1200;

/** Simulated games per move when the hard computer thinks on the main thread. */
export const FALLBACK_SAMPLES = 4;

/** Maximum simulated games per move of the hard computer. */
export const MAX_SAMPLES = 64;
