import { AI_DIFFICULTIES, allMutatorIds, type AiDifficulty } from '@gwent/engine';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { sfx } from '@/shared/audio/audio-manager';
import i18n, { SUPPORTED_LANGUAGES, type Language } from '@/shared/i18n';

export interface Settings {
  /** null = not chosen yet (uses the language detected from the browser). */
  language: Language | null;
  /** Notification banners during the match ("Your turn!" etc.). */
  notifications: boolean;
  sound: boolean;
  /** Sound effects volume, from 0 to 1. */
  soundVolume: number;
  /** Game music (YouTube): only loads when on. */
  music: boolean;
  /** Strength of the computer opponent (applies from the next match). */
  botDifficulty: AiDifficulty;
  /** Extra rules for matches against the computer (applies from the next match). */
  mutators: string[];
}

interface SettingsState extends Settings {
  setLanguage(language: Language): void;
  update(patch: Partial<Omit<Settings, 'language'>>): void;
}

const DEFAULTS: Settings = {
  language: null,
  notifications: true,
  sound: true,
  soundVolume: 0.5,
  music: false,
  botDifficulty: 'normal',
  mutators: [],
};

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/** Accepts only values of the right type; the rest go back to the default. */
function sanitize(persisted: unknown): Settings {
  const saved = (persisted ?? {}) as Partial<Record<keyof Settings, unknown>>;
  const bool = (key: 'notifications' | 'sound' | 'music') =>
    typeof saved[key] === 'boolean' ? (saved[key] as boolean) : DEFAULTS[key];
  const volume = saved.soundVolume;
  return {
    language: isLanguage(saved.language) ? saved.language : null,
    notifications: bool('notifications'),
    sound: bool('sound'),
    soundVolume:
      typeof volume === 'number' && volume >= 0 && volume <= 1 ? volume : DEFAULTS.soundVolume,
    music: bool('music'),
    botDifficulty: (AI_DIFFICULTIES as readonly unknown[]).includes(saved.botDifficulty)
      ? (saved.botDifficulty as AiDifficulty)
      : DEFAULTS.botDifficulty,
    // Only known rules, once each (a rule may be removed in a later version)
    mutators: Array.isArray(saved.mutators)
      ? [
          ...new Set(
            saved.mutators.filter((id): id is string => allMutatorIds().includes(id as string)),
          ),
        ]
      : DEFAULTS.mutators,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setLanguage: (language) => set({ language }),
      update: (patch) => set(patch),
    }),
    {
      name: 'gwent:settings',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: ({
        language,
        notifications,
        sound,
        soundVolume,
        music,
        botDifficulty,
        mutators,
      }) => ({
        language,
        notifications,
        sound,
        soundVolume,
        music,
        botDifficulty,
        mutators,
      }),
      // Broken saved data (or data from another version) must not break the app.
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
      migrate: (persisted) => sanitize(persisted),
    },
  ),
);

/** Applies the settings to i18next, <html lang> and the audio. Call once at startup. */
export function bootSettings(): void {
  const apply = (state: Settings, previous?: Settings) => {
    if (state.language && i18n.language !== state.language)
      void i18n.changeLanguage(state.language);
    if (!previous || state.sound !== previous.sound || state.soundVolume !== previous.soundVolume) {
      sfx.configure({ enabled: state.sound, volume: state.soundVolume });
    }
  };
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
  document.documentElement.lang = i18n.language;
  apply(useSettingsStore.getState());
  useSettingsStore.subscribe((state, previous) => apply(state, previous));
}
