import { REPLAY_FILE_VERSION, type ReplayFile } from '@gwent/shared';
import type { LocalMatch } from '../interfaces/match';

/**
 * Builds the replay file of a match against the computer.
 *
 * @param match - Finished or ongoing local match.
 * @returns The replay file.
 */
export const toReplayFile = (match: LocalMatch): ReplayFile => ({
  version: REPLAY_FILE_VERSION,
  seed: match.setup.seed,
  decks: match.setup.decks,
  mutators: [...(match.setup.mutators ?? [])],
  actions: match.actions,
  side: match.human,
  names: { p1: '', p2: '' },
  createdAt: new Date().toISOString(),
});
