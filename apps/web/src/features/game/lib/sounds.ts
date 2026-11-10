import { defOf, type GameEvent, type GameState, type PlayerId } from '@gwent/engine';
import type { SoundKey } from '@/shared/audio/audio-manager';
import type { Notice } from './notices';

/** Sound of each ability. */
const ABILITY_SOUNDS: Record<string, SoundKey> = {
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
  storm: 'fog', // the sound of the card's last ability
  clear: 'clear',
};

// Transformation (berserker → bear) only plays the Mardroeme sound.
const PLACEMENT_REASONS = new Set(['play', 'muster', 'revive', 'summon']);

/** Sound of a card entering a row: hero, or the row sound. */
function placementSound(state: GameState, e: Extract<GameEvent, { type: 'CARD_MOVED' }>) {
  if (e.to.kind !== 'row' || !PLACEMENT_REASONS.has(e.reason) || !state.cards[e.cardId])
    return null;
  const def = defOf(state, e.cardId);
  // Spy and Decoy already have their own ability sound
  if (def.abilities.includes('spy') || def.abilities.includes('decoy')) return null;
  if (def.hero) return 'hero';
  return `common_${e.to.row}` as const;
}

/**
 * Sounds of a batch of events, in order, without repeats. `state` is the state after the events
 * (to know the card types); `notices` decides the turn sounds (only when the turn changes).
 */
export function soundsFor(
  events: readonly GameEvent[],
  notices: readonly Notice[],
  state: GameState,
  human: PlayerId,
): SoundKey[] {
  const out: SoundKey[] = [];
  const add = (key: SoundKey | null) => {
    if (key && !out.includes(key)) out.push(key);
  };

  for (const e of events) {
    switch (e.type) {
      case 'COIN_TOSSED':
      case 'FIRST_PLAYER_CHOSEN':
        add('game_opening');
        break;
      case 'CARD_REDRAWN':
        add('redraw');
        break;
      case 'CARD_MOVED':
        // The 10 starting cards: game start sound (before the redraw)
        if (e.reason === 'draw') add(state.round === 0 ? 'game_start' : 'draw');
        else if (e.reason === 'discard' && e.to.kind === 'grave') add('discard');
        else add(placementSound(state, e));
        break;
      case 'ABILITY_TRIGGERED':
        add(ABILITY_SOUNDS[e.ability] ?? null);
        break;
      case 'MUTATOR_TRIGGERED':
        // Inspiration boosts a unit: same sound as morale
        if (e.mutator === 'inspiration') add('morale');
        break;
      case 'ROUND_STARTED':
        if (e.round === 1) add('round1_start');
        break;
      case 'PLAYER_PASSED':
        add('pass');
        break;
      case 'ROUND_ENDED':
        add(e.winner === human ? 'round_win' : 'round_lose');
        break;
      case 'GAME_ENDED':
        add(e.result === human ? 'game_win' : 'game_lose');
        break;
      default:
        break;
    }
  }
  for (const notice of notices) {
    if (notice.key === 'me-turn') add('turn_me');
    if (notice.key === 'op-turn') add('turn_op');
  }
  return out;
}
