/** Match seeds whose matches the suite plays from start to end. */
export const MATCH_SEEDS = [1, 2, 7] as const;

/** Seed used when a test only needs some match (the first turns are known to be playable). */
export const DEFAULT_SEED = 7;

/** localStorage key of the settings store (apps/web settings.store.ts). */
export const SETTINGS_STORAGE_KEY = 'gwent:settings';

/** Version of the persisted settings (apps/web settings.store.ts); update both together. */
export const SETTINGS_STORE_VERSION = 2;

/** localStorage key of the server profile store (apps/web profile.store.ts). */
export const PROFILE_STORAGE_KEY = 'gwent:profile';

/** Version of the persisted profile (apps/web profile.store.ts); update both together. */
export const PROFILE_STORE_VERSION = 1;

/** Console errors of a failed API request: the browser's own and the app's reportError ones. */
export const FAILED_REQUEST_ERRORS = /Failed to load resource|^\[[^\]]+\]/;

/** Longest time a whole match may take before the test gives up, in milliseconds. */
export const MATCH_DEADLINE_MS = 150_000;

/** Time to wait for the bot (or the opponent) to hand the turn back, in milliseconds. */
export const TURN_TIMEOUT_MS = 30_000;

/** Time the P key must be held to pass the round (apps/web PASS_HOLD_MS), in milliseconds. */
export const PASS_HOLD_MS = 1000;

/** Gamepad button indexes of the standard mapping. */
export const GAMEPAD_BUTTONS = {
  a: 0,
  b: 1,
  x: 2,
  y: 3,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

/** Tag of the tests that need the API and the database (filtered out when they are down). */
export const SERVER_TAG = '@server';

/** Tag of the tests that play whole matches (minutes each). */
export const SLOW_TAG = '@slow';
