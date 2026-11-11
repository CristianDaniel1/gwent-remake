import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LocalProfile, ProfileState } from '../interfaces/profile';

const isProfile = (value: unknown): value is LocalProfile =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as LocalProfile).id === 'string' &&
  typeof (value as LocalProfile).name === 'string';

/** Store of the server profile, persisted in the browser. */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
    }),
    {
      name: 'gwent:profile',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ profile }) => ({ profile }),
      merge: (persisted, current) => {
        const saved = (persisted as { profile?: unknown } | undefined)?.profile;
        return { ...current, profile: isProfile(saved) ? saved : null };
      },
    },
  ),
);
