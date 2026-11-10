import type { GameEvent, GameState, PlayerId } from '@gwent/engine';
import { useEffect, useRef } from 'react';
import { sfx } from '@/shared/audio/audio-manager';
import { noticesFrom } from '../lib/notices';
import { soundsFor } from '../lib/sounds';
import { useGameStore } from '../store/game.store';

/** Gap between sounds of the same move, so they do not blend into one noise. */
const STAGGER_MS = 180;

function playSounds(keys: ReturnType<typeof soundsFor>) {
  keys.forEach((key, i) => {
    setTimeout(() => sfx.play(key), i * STAGGER_MS);
  });
}

/**
 * Plays the sounds of one move outside a live match (e.g. a replay). `lastTurn` is who had
 * the turn before these events, so the turn sound only plays when the turn changes.
 */
export function playMoveSounds(
  events: readonly GameEvent[],
  state: GameState,
  human: PlayerId,
  lastTurn: PlayerId | null,
) {
  const { notices } = noticesFrom([...events], human, lastTurn);
  playSounds(soundsFor([...events], notices, state, human));
}

/** Plays the sounds of each batch of match events (once per batch). */
export function useGameSounds() {
  const log = useGameStore((s) => s.eventLog);
  const match = useGameStore((s) => s.match);
  const played = useRef(0);

  useEffect(() => {
    if (!log || !match || log.seq === played.current) return;
    played.current = log.seq;
    playSounds(soundsFor(log.events, log.notices, match.state, match.human));
  }, [log, match]);
}
