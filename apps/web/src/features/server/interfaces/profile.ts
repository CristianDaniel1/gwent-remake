export interface LocalProfile {
  id: string;
  name: string;
}

export interface ProfileState {
  profile: LocalProfile | null;
  setProfile(profile: LocalProfile | null): void;
}
