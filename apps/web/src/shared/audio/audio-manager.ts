import { assets } from '@/shared/lib/assets';

/** Available sounds (files in public/assets/sfx). */
export const SOUNDS = [
  'bond',
  'clear',
  'common_close',
  'common_ranged',
  'common_siege',
  'decoy',
  'discard',
  'draw',
  'fog',
  'frost',
  'game_lose',
  'game_opening',
  'game_start',
  'game_win',
  'hero',
  'horn',
  'mardroeme',
  'medic',
  'menu_opening',
  'morale',
  'muster',
  'open',
  'pass',
  'rain',
  'redraw',
  'round1_start',
  'round_lose',
  'round_win',
  'scorch',
  'spy',
  'turn_me',
  'turn_op',
  'ui_card',
  'ui_card_bank',
  'warning',
] as const;
export type SoundKey = (typeof SOUNDS)[number];

const cache = new Map<SoundKey, HTMLAudioElement>();
let enabled = true;
let volume = 0.5;

function element(key: SoundKey): HTMLAudioElement {
  let audio = cache.get(key);
  if (!audio) {
    audio = new Audio(assets.sfx(key));
    audio.preload = 'auto';
    cache.set(key, audio);
  }
  return audio;
}

/**
 * Sound effects. One <audio> element per sound: playing again restarts from the beginning.
 * Failures (browser blocking audio before a click) are ignored.
 */
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
