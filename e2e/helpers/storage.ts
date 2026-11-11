import type { Page } from '@playwright/test';
import {
  PROFILE_STORAGE_KEY,
  PROFILE_STORE_VERSION,
  SETTINGS_STORAGE_KEY,
  SETTINGS_STORE_VERSION,
} from '../constants/e2e.constants';

/** Settings a test can start with (a subset of the app's settings store). */
export interface SeedSettings {
  botDifficulty?: 'easy' | 'normal' | 'hard';
  mutators?: string[];
  sound?: boolean;
  language?: string;
}

/** Server profile a test can start with, as the app keeps it in the browser. */
export interface SeedProfile {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Writes a persisted store entry before the app loads.
 *
 * @param page - Page that will open the app.
 * @param key - localStorage key of the store.
 * @param version - Version of the persisted store.
 * @param state - State to store.
 */
const seedStore = async (page: Page, key: string, version: number, state: unknown) => {
  await page.addInitScript(({ storageKey, value }) => localStorage.setItem(storageKey, value), {
    storageKey: key,
    value: JSON.stringify({ state, version }),
  });
};

/**
 * Stores settings before the app loads, as if the player had chosen them earlier.
 *
 * @param page - Page that will open the app.
 * @param settings - Settings to store.
 */
export const seedSettings = (page: Page, settings: SeedSettings) =>
  seedStore(page, SETTINGS_STORAGE_KEY, SETTINGS_STORE_VERSION, settings);

/**
 * Stores a server profile before the app loads, as if the player had created it earlier.
 *
 * @param page - Page that will open the app.
 * @param profile - Profile to store.
 */
export const seedProfile = (page: Page, profile: SeedProfile) =>
  seedStore(page, PROFILE_STORAGE_KEY, PROFILE_STORE_VERSION, { profile });
