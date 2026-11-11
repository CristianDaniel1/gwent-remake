import type { BoardMatch } from '../interfaces/match';

/** Translation key of the exit button by match mode. */
export const EXIT_LABELS: Record<BoardMatch['mode'], string> = {
  local: 'match.exit',
  online: 'match.exit',
  replay: 'replay.exit',
  spectate: 'online.stopWatching',
};
