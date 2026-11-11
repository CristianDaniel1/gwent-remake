import type { GameEvent, GameState, PlayerId } from '@gwent/engine';
import { sfx } from '@/shared/audio/audio-manager';
import { type SoundKey } from '@/shared/interfaces/audio';
import { noticesFrom } from './notices';
import { soundsFor } from './sounds';
import { STAGGER_MS } from '../constants/timings';

/**
 * Plays a list of sounds, slightly apart from each other.
 *
 * @param keys - Sounds to play, in order.
 */
export const playSounds = (keys: readonly SoundKey[]) => {
  keys.forEach((key, index) => setTimeout(() => sfx.play(key), index * STAGGER_MS));
};

/**
 * Plays the sounds of one move outside a live match.
 *
 * @param events - Events of the move.
 * @param state - State after the move.
 * @param human - Player shown at the bottom.
 * @param lastTurn - Player who had the turn before the move.
 */
export const playMoveSounds = (
  events: readonly GameEvent[],
  state: GameState,
  human: PlayerId,
  lastTurn: PlayerId | null,
) => {
  const { notices } = noticesFrom(events, human, lastTurn);
  playSounds(soundsFor(events, notices, state, human));
};
