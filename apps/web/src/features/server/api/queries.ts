import {
  DeckRecordSchema,
  MatchDetailSchema,
  MatchSummarySchema,
  ProfileSchema,
  type CreateMatch,
  type SaveDeck,
} from '@gwent/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest, ApiRequestError } from '@/shared/api/http';
import { useProfileStore } from '../store/profile.store';

/** Cache keys (in one place, to invalidate without misspelling a name). */
export const serverKeys = {
  health: ['server', 'health'] as const,
  decks: (profileId: string) => ['server', 'decks', profileId] as const,
  matches: (profileId: string) => ['server', 'matches', profileId] as const,
  match: (id: string) => ['server', 'match', id] as const,
};

const HealthSchema = z.object({ status: z.literal('ok') });

/** Is the server up? (the game works without it; this only enables the online features) */
export function useServerStatus() {
  const query = useQuery({
    queryKey: serverKeys.health,
    queryFn: ({ signal }) => apiRequest('/health', { schema: HealthSchema, signal }),
    refetchInterval: 30_000,
  });
  return { online: query.isSuccess, checking: query.isPending };
}

/** Server profile stored in this browser (null = not created yet). */
export function useProfile() {
  return useProfileStore((s) => s.profile);
}

export function useCreateProfile() {
  const setProfile = useProfileStore((s) => s.setProfile);
  return useMutation({
    mutationFn: (name: string) =>
      apiRequest('/profiles', { method: 'POST', body: { name }, schema: ProfileSchema }),
    onSuccess: (profile) => setProfile({ id: profile.id, name: profile.name }),
  });
}

/** Forgets the local profile when the server answers 404 (e.g. the database was wiped). */
function forgetMissingProfile(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 404) {
    useProfileStore.getState().setProfile(null);
  }
}

export function useServerDecks() {
  const profile = useProfile();
  const { online } = useServerStatus();
  return useQuery({
    queryKey: serverKeys.decks(profile?.id ?? 'none'),
    enabled: online && !!profile,
    queryFn: async ({ signal }) => {
      try {
        return await apiRequest(`/profiles/${profile!.id}/decks`, {
          schema: z.array(DeckRecordSchema),
          signal,
        });
      } catch (error) {
        forgetMissingProfile(error);
        throw error;
      }
    },
  });
}

export function useSaveDeck() {
  const client = useQueryClient();
  const profile = useProfile();
  return useMutation({
    mutationFn: ({ id, ...body }: SaveDeck & { id?: string }) =>
      apiRequest(id ? `/profiles/${profile!.id}/decks/${id}` : `/profiles/${profile!.id}/decks`, {
        method: id ? 'PUT' : 'POST',
        body,
        schema: DeckRecordSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: serverKeys.decks(profile!.id) }),
  });
}

export function useDeleteDeck() {
  const client = useQueryClient();
  const profile = useProfile();
  return useMutation({
    mutationFn: (deckId: string) =>
      apiRequest(`/profiles/${profile!.id}/decks/${deckId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: serverKeys.decks(profile!.id) }),
  });
}

export function useMatchHistory() {
  const profile = useProfile();
  const { online } = useServerStatus();
  return useQuery({
    queryKey: serverKeys.matches(profile?.id ?? 'none'),
    enabled: online && !!profile,
    queryFn: async ({ signal }) => {
      try {
        return await apiRequest(`/profiles/${profile!.id}/matches`, {
          schema: z.array(MatchSummarySchema),
          signal,
        });
      } catch (error) {
        forgetMissingProfile(error);
        throw error;
      }
    },
  });
}

/** Sends the finished match; the server replays it to check the result. */
export function useRecordMatch() {
  const client = useQueryClient();
  const profile = useProfile();
  return useMutation({
    mutationFn: (match: CreateMatch) =>
      apiRequest(`/profiles/${profile!.id}/matches`, {
        method: 'POST',
        body: match,
        schema: MatchSummarySchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: serverKeys.matches(profile!.id) }),
  });
}

/** A saved match with everything needed to replay it. Finished matches never change. */
export function useMatchDetail(id: string | null) {
  return useQuery({
    queryKey: serverKeys.match(id ?? 'none'),
    enabled: !!id,
    staleTime: Infinity,
    queryFn: ({ signal }) => apiRequest(`/matches/${id}`, { schema: MatchDetailSchema, signal }),
  });
}
