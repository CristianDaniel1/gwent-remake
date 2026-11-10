import { describe, expect, it } from 'vitest';
import { useSettingsStore } from './settings.store';

describe('saved settings', () => {
  it('resets broken values from the browser to the defaults instead of breaking the app', async () => {
    localStorage.setItem(
      'gwent:settings',
      JSON.stringify({
        state: {
          language: 'klingon',
          notifications: 'sim',
          sound: false,
          soundVolume: 7,
          music: true,
        },
        version: 2,
      }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.language).toBeNull();
    expect(s.notifications).toBe(true);
    expect(s.sound).toBe(false); // this one was valid and stays
    expect(s.soundVolume).toBe(0.5);
    expect(s.music).toBe(true);
    localStorage.clear();
  });
});
