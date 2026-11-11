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
    const settings = useSettingsStore.getState();
    expect(settings.language).toBeNull();
    expect(settings.notifications).toBe(true);
    expect(settings.sound).toBe(false);
    expect(settings.soundVolume).toBe(0.5);
    expect(settings.music).toBe(true);
    localStorage.clear();
  });
});
