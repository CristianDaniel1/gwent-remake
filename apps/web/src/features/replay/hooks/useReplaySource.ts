import { ReplayFileSchema, type ReplayFile } from '@gwent/shared';
import { useMemo } from 'react';
import { useLocation } from 'react-router';
import { useMatchDetail, useProfile } from '@/features/server';
import { fromMatchDetail } from '../lib/replay-file';

/**
 * Loads the replay from the navigation state or from the server.
 *
 * @param id - Saved match id, or "local".
 * @returns The replay and its loading state.
 */
export const useReplaySource = (id: string) => {
  const location = useLocation();
  const profile = useProfile();
  const isLocal = id === 'local';
  const detail = useMatchDetail(isLocal ? null : id);

  const replay = useMemo<ReplayFile | null>(() => {
    if (isLocal) {
      const parsed = ReplayFileSchema.safeParse(location.state);
      return parsed.success ? parsed.data : null;
    }
    return detail.data ? fromMatchDetail(detail.data, profile?.name ?? '') : null;
  }, [isLocal, location.state, detail.data, profile?.name]);

  return { replay, isLocal, loading: !isLocal && detail.isPending };
};
