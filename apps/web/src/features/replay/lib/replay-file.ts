import { REPLAY_FILE_VERSION, type MatchDetail, type ReplayFile } from '@gwent/shared';
import { downloadText } from '@/shared/lib/download';

/**
 * Builds a replay file from a match saved on the server.
 *
 * @param detail - Saved match.
 * @param profileName - Name of the profile that played it.
 * @returns The replay file.
 */
export const fromMatchDetail = (detail: MatchDetail, profileName: string): ReplayFile => {
  const other = detail.side === 'p1' ? 'p2' : 'p1';
  return {
    version: REPLAY_FILE_VERSION,
    seed: detail.seed,
    decks: detail.decks,
    mutators: detail.mutators,
    actions: detail.actions,
    side: detail.side,
    names: {
      [detail.side]: profileName,
      [other]: detail.opponentName ?? '',
    } as ReplayFile['names'],
    createdAt: detail.createdAt,
  };
};

/**
 * Downloads a replay as a JSON file.
 *
 * @param replay - Replay to download.
 */
export const downloadReplay = (replay: ReplayFile): void => {
  const date = (replay.createdAt ?? new Date().toISOString()).slice(0, 10);
  downloadText(`gwent-replay-${date}-${replay.seed}.json`, JSON.stringify(replay));
};
