import { useEffect } from 'react';
import { useProfile, useRecordMatch, useServerStatus } from '@/features/server';
import type { BoardMatch } from '../interfaces/match';
import type { LocalMatch } from '../interfaces/match';
import type { RecordingStatus } from '../interfaces/recording';

const recorded = new WeakSet<LocalMatch['setup']>();

/**
 * Sends a finished match against the computer to the server history.
 *
 * @param match - Match on the board.
 * @returns The sending status.
 */
export const useMatchRecording = (match: BoardMatch | null): RecordingStatus => {
  const { online } = useServerStatus();
  const profile = useProfile();
  const record = useRecordMatch();
  const local = match?.mode === 'local' ? match : null;
  const finished = local?.state.phase === 'gameOver';

  useEffect(() => {
    if (!local || !finished || !online || !profile || recorded.has(local.setup)) return;
    recorded.add(local.setup);
    record.mutate({
      seed: local.setup.seed,
      decks: local.setup.decks,
      mutators: [...(local.setup.mutators ?? [])],
      actions: local.actions,
    });
  }, [local, finished, online, profile, record]);

  if (!finished) return 'idle';
  if (!online) return 'offline';
  if (!profile) return 'noProfile';
  if (record.isPending) return 'saving';
  if (record.isError) return 'error';
  return record.isSuccess || (local && recorded.has(local.setup)) ? 'saved' : 'saving';
};
