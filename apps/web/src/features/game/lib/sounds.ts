import { defOf, type GameEvent, type GameState, type PlayerId } from '@gwent/engine';
import type { SoundKey } from '@/shared/interfaces/audio';
import { ABILITY_SOUNDS, NOTICE_SOUNDS, PLACEMENT_REASONS } from '../data/sounds';
import type { Notice } from '../interfaces/notices';
import type { CardMovedEvent } from '../interfaces/events';

const placementSound = (state: GameState, event: CardMovedEvent): SoundKey | null => {
  if (event.to.kind !== 'row' || !PLACEMENT_REASONS.has(event.reason) || !state.cards[event.cardId])
    return null;
  const def = defOf(state, event.cardId);
  if (def.abilities.includes('spy') || def.abilities.includes('decoy')) return null;
  if (def.hero) return 'hero';
  return `common_${event.to.row}`;
};

const cardMovedSound = (state: GameState, event: CardMovedEvent): SoundKey | null => {
  if (event.reason === 'draw') return state.round === 0 ? 'game_start' : 'draw';
  if (event.reason === 'discard' && event.to.kind === 'grave') return 'discard';
  return placementSound(state, event);
};

const eventSound = (event: GameEvent, state: GameState, human: PlayerId): SoundKey | null => {
  switch (event.type) {
    case 'COIN_TOSSED':
    case 'FIRST_PLAYER_CHOSEN':
      return 'game_opening';
    case 'CARD_REDRAWN':
      return 'redraw';
    case 'CARD_MOVED':
      return cardMovedSound(state, event);
    case 'ABILITY_TRIGGERED':
      return ABILITY_SOUNDS[event.ability] ?? null;
    case 'MUTATOR_TRIGGERED':
      return event.mutator === 'inspiration' ? 'morale' : null;
    case 'ROUND_STARTED':
      return event.round === 1 ? 'round1_start' : null;
    case 'PLAYER_PASSED':
      return 'pass';
    case 'ROUND_ENDED':
      return event.winner === human ? 'round_win' : 'round_lose';
    case 'GAME_ENDED':
      return event.result === human ? 'game_win' : 'game_lose';
    default:
      return null;
  }
};

/**
 * Lists the sounds of a move, in order and without repeats.
 *
 * @param events - Events of the move.
 * @param notices - Notices of the move.
 * @param state - State after the move.
 * @param human - Human player.
 * @returns The sound keys.
 */
export const soundsFor = (
  events: readonly GameEvent[],
  notices: readonly Notice[],
  state: GameState,
  human: PlayerId,
): SoundKey[] => {
  const sounds = new Set<SoundKey>();
  for (const event of events) {
    const sound = eventSound(event, state, human);
    if (sound) sounds.add(sound);
  }
  for (const notice of notices) {
    const sound = NOTICE_SOUNDS[notice.key];
    if (sound) sounds.add(sound);
  }
  return [...sounds];
};
