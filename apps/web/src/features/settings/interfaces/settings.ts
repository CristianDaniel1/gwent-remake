import type { AiDifficulty } from '@gwent/engine';
import type { Language } from '@/shared/i18n';

export interface Settings {
  language: Language | null;
  notifications: boolean;
  sound: boolean;
  soundVolume: number;
  music: boolean;
  botDifficulty: AiDifficulty;
  mutators: string[];
}

export interface SettingsState extends Settings {
  /**
   * Changes the interface language.
   *
   * @param language - Language to use.
   */
  setLanguage(language: Language): void;
  /**
   * Updates one or more settings.
   *
   * @param patch - Settings to change.
   */
  update(patch: Partial<Omit<Settings, 'language'>>): void;
}

export type SavedSettings = Partial<Record<keyof Settings, unknown>>;
