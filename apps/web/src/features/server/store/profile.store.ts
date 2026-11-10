import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LocalProfile {
  id: string;
  name: string;
}

interface ProfileState {
  /** Profile on the server (no login: the id is stored in the browser). */
  profile: LocalProfile | null;
  setProfile(profile: LocalProfile | null): void;
}

const isProfile = (value: unknown): value is LocalProfile =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as LocalProfile).id === 'string' &&
  typeof (value as LocalProfile).name === 'string';

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
