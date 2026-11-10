import {
  REPLAY_FILE_VERSION,
  ReplayFileSchema,
  type MatchDetail,
  type ReplayFile,
} from '@gwent/shared';
import { downloadText } from '@/shared/lib/download';

/** Replay of a match saved on the server, labeled with the profile's name. */
export function fromMatchDetail(detail: MatchDetail, profileName: string): ReplayFile {
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
}

/** Reads an exported replay file; null when it is not valid JSON or not a replay. */
export function parseReplayFile(text: string): ReplayFile | null {
  try {
    const parsed = ReplayFileSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function downloadReplay(replay: ReplayFile): void {
  const date = (replay.createdAt ?? new Date().toISOString()).slice(0, 10);
  downloadText(`gwent-replay-${date}-${replay.seed}.json`, JSON.stringify(replay));
}
