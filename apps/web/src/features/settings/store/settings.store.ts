import { AI_DIFFICULTIES, allMutatorIds, type AiDifficulty } from '@gwent/engine';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { sfx } from '@/shared/audio/audio-manager';
import i18n, { SUPPORTED_LANGUAGES, type Language } from '@/shared/i18n';
import { reportError } from '@/shared/lib/report-error';
import type { SavedSettings, Settings, SettingsState } from '../interfaces/settings';
import { DEFAULT_SETTINGS } from '../constants/settings';

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

const savedBoolean = (saved: SavedSettings, key: 'notifications' | 'sound' | 'music'): boolean => {
  const value = saved[key];
  return typeof value === 'boolean' ? value : DEFAULT_SETTINGS[key];
};

const sanitize = (persisted: unknown): Settings => {
  const saved = (persisted ?? {}) as SavedSettings;
  const volume = saved.soundVolume;
  return {
    language: isLanguage(saved.language) ? saved.language : null,
    notifications: savedBoolean(saved, 'notifications'),
    sound: savedBoolean(saved, 'sound'),
    soundVolume:
      typeof volume === 'number' && volume >= 0 && volume <= 1
        ? volume
        : DEFAULT_SETTINGS.soundVolume,
    music: savedBoolean(saved, 'music'),
    botDifficulty: (AI_DIFFICULTIES as readonly unknown[]).includes(saved.botDifficulty)
      ? (saved.botDifficulty as AiDifficulty)
      : DEFAULT_SETTINGS.botDifficulty,
    mutators: Array.isArray(saved.mutators)
      ? [
          ...new Set(
            saved.mutators.filter((id): id is string => allMutatorIds().includes(id as string)),
          ),
        ]
      : DEFAULT_SETTINGS.mutators,
  };
};

/** Store of the user settings, persisted in the browser. */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
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
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
      migrate: (persisted) => sanitize(persisted),
    },
  ),
);

const changeLanguage = async (language: Language) => {
  try {
    await i18n.changeLanguage(language);
  } catch (error) {
    reportError('settings: change language', error);
  }
};

const applySettings = (state: Settings, previous?: Settings) => {
  if (state.language && i18n.language !== state.language) void changeLanguage(state.language);
  const soundChanged =
    !previous || state.sound !== previous.sound || state.soundVolume !== previous.soundVolume;
  if (soundChanged) sfx.configure({ enabled: state.sound, volume: state.soundVolume });
};

const syncDocumentLanguage = (language: string) => {
  document.documentElement.lang = language;
};

/** Applies the saved settings and keeps them applied as they change. */
export const bootSettings = (): void => {
  i18n.on('languageChanged', syncDocumentLanguage);
  syncDocumentLanguage(i18n.language);
  applySettings(useSettingsStore.getState());
  useSettingsStore.subscribe(applySettings);
};
