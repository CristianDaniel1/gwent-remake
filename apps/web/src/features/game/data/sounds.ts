import type { SoundKey } from '@/shared/interfaces/audio';

/** Sound of each ability. */
export const ABILITY_SOUNDS: Record<string, SoundKey> = {
  horn: 'horn',
  spy: 'spy',
  medic: 'medic',
  morale: 'morale',
  bond: 'bond',
  decoy: 'decoy',
  scorch: 'scorch',
  muster: 'muster',
  mardroeme: 'mardroeme',
  berserker: 'mardroeme',
  frost: 'frost',
  fog: 'fog',
  rain: 'rain',
  storm: 'fog',
  clear: 'clear',
};

/** Move reasons that play a placement sound. */
export const PLACEMENT_REASONS = new Set(['play', 'muster', 'revive', 'summon']);

/** Sound of each notice that has one. */
export const NOTICE_SOUNDS: Partial<Record<string, SoundKey>> = {
  'me-turn': 'turn_me',
  'op-turn': 'turn_op',
};
