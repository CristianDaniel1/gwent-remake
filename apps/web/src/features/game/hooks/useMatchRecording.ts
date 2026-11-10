import { useEffect } from 'react';
import { useProfile, useRecordMatch, useServerStatus } from '@/features/server';
import type { BoardMatch, LocalMatch } from '../store/game.store';

export type RecordingStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'noProfile' | 'error';

/**
 * Matches already sent. Lives outside the component: if the board is mounted again
 * after the match ends, the match is not saved twice.
 */
const recorded = new WeakSet<LocalMatch['setup']>();

/**
 * When the match ends, sends seed + decks + actions to the server history
 * (once per match). Without a server or a profile, the game goes on normally.
 */
export function useMatchRecording(match: BoardMatch | null): RecordingStatus {
  const { online } = useServerStatus();
  const profile = useProfile();
  const record = useRecordMatch();
  // Only matches against the bot (online matches stay out of the history for now)
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
  // Mounted again after saving: the new mutation is idle, but the match was already sent
  return record.isSuccess || (local && recorded.has(local.setup)) ? 'saved' : 'saving';
}
