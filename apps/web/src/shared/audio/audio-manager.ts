import { assets } from '@/shared/lib/assets';
import type { SoundKey } from '../interfaces/audio';

const cache = new Map<SoundKey, HTMLAudioElement>();
let enabled = true;
let volume = 0.5;

const element = (key: SoundKey): HTMLAudioElement => {
  let audio = cache.get(key);
  if (!audio) {
    audio = new Audio(assets.sfx(key));
    audio.preload = 'auto';
    cache.set(key, audio);
  }
  return audio;
};

/** Plays the sound effects with the configured volume. */
export const sfx = {
  configure(options: { enabled: boolean; volume: number }) {
    enabled = options.enabled;
    volume = Math.min(1, Math.max(0, options.volume));
  },
  play(key: SoundKey) {
    if (!enabled || volume === 0) return;
    const audio = element(key);
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play()?.catch(() => {});
  },
};
