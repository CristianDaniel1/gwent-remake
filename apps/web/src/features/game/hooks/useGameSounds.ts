import { useEffect, useRef } from 'react';
import { playSounds } from '../lib/play-sounds';
import { soundsFor } from '../lib/sounds';
import { useGameStore } from '../store/game.store';

/** Plays the sounds of each new batch of match events. */
export const useGameSounds = () => {
  const log = useGameStore((store) => store.eventLog);
  const match = useGameStore((store) => store.match);
  const played = useRef(0);

  useEffect(() => {
    if (!log || !match || log.seq === played.current) return;
    played.current = log.seq;
    playSounds(soundsFor(log.events, log.notices, match.state, match.human));
  }, [log, match]);
};
