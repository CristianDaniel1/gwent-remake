import type { Settings } from '../interfaces/settings';

/** Settings used when nothing is saved. */
export const DEFAULT_SETTINGS: Settings = {
  language: null,
  notifications: true,
  sound: true,
  soundVolume: 0.5,
  music: false,
  botDifficulty: 'normal',
  mutators: [],
};
