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
import { SERVER_QUERY_KEYS } from '../constants/query-keys';
import { HealthSchema } from './schemas';

/**
 * Checks whether the server is reachable.
 *
 * @returns Whether it is online and whether the check is still running.
 */
export const useServerStatus = () => {
  const query = useQuery({
    queryKey: SERVER_QUERY_KEYS.health,
    queryFn: ({ signal }) => apiRequest('/health', { schema: HealthSchema, signal }),
    refetchInterval: 30_000,
  });
  return { online: query.isSuccess, checking: query.isPending };
};

/**
 * Reads the server profile saved in this browser.
 *
 * @returns The profile, or null.
 */
export const useProfile = () => useProfileStore((store) => store.profile);

/**
 * Creates a server profile and saves it in this browser.
 *
 * @returns The create mutation.
 */
export const useCreateProfile = () => {
  const setProfile = useProfileStore((store) => store.setProfile);
  return useMutation({
    mutationFn: (name: string) =>
      apiRequest('/profiles', { method: 'POST', body: { name }, schema: ProfileSchema }),
    onSuccess: (profile) => setProfile({ id: profile.id, name: profile.name }),
  });
};

const forgettingMissingProfile = async <T>(request: Promise<T>): Promise<T> => {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404)
      useProfileStore.getState().setProfile(null);
    throw error;
  }
};

/**
 * Fetches the decks saved on the server.
 *
 * @returns The decks query.
 */
export const useServerDecks = () => {
  const profile = useProfile();
  const { online } = useServerStatus();
  return useQuery({
    queryKey: SERVER_QUERY_KEYS.decks(profile?.id ?? 'none'),
    enabled: online && !!profile,
    queryFn: ({ signal }) =>
      forgettingMissingProfile(
        apiRequest(`/profiles/${profile!.id}/decks`, { schema: z.array(DeckRecordSchema), signal }),
      ),
  });
};

/**
 * Saves a deck on the server, updating it when an id is given.
 *
 * @returns The save mutation.
 */
export const useSaveDeck = () => {
  const client = useQueryClient();
  const profile = useProfile();
  return useMutation({
    mutationFn: ({ id, ...body }: SaveDeck & { id?: string }) =>
      apiRequest(id ? `/profiles/${profile!.id}/decks/${id}` : `/profiles/${profile!.id}/decks`, {
        method: id ? 'PUT' : 'POST',
        body,
        schema: DeckRecordSchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: SERVER_QUERY_KEYS.decks(profile!.id) }),
  });
};

/**
 * Deletes a deck saved on the server.
 *
 * @returns The delete mutation.
 */
export const useDeleteDeck = () => {
  const client = useQueryClient();
  const profile = useProfile();
  return useMutation({
    mutationFn: (deckId: string) =>
      apiRequest(`/profiles/${profile!.id}/decks/${deckId}`, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey: SERVER_QUERY_KEYS.decks(profile!.id) }),
  });
};

/**
 * Fetches the profile's match history.
 *
 * @returns The history query.
 */
export const useMatchHistory = () => {
  const profile = useProfile();
  const { online } = useServerStatus();
  return useQuery({
    queryKey: SERVER_QUERY_KEYS.matches(profile?.id ?? 'none'),
    enabled: online && !!profile,
    queryFn: ({ signal }) =>
      forgettingMissingProfile(
        apiRequest(`/profiles/${profile!.id}/matches`, {
          schema: z.array(MatchSummarySchema),
          signal,
        }),
      ),
  });
};

/**
 * Sends a finished match to the server history.
 *
 * @returns The record mutation.
 */
export const useRecordMatch = () => {
  const client = useQueryClient();
  const profile = useProfile();
  return useMutation({
    mutationFn: (match: CreateMatch) =>
      apiRequest(`/profiles/${profile!.id}/matches`, {
        method: 'POST',
        body: match,
        schema: MatchSummarySchema,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: SERVER_QUERY_KEYS.matches(profile!.id) }),
  });
};

/**
 * Fetches a saved match with everything needed to replay it.
 *
 * @param id - Match id, or null to skip the request.
 * @returns The match query.
 */
export const useMatchDetail = (id: string | null) =>
  useQuery({
    queryKey: SERVER_QUERY_KEYS.match(id ?? 'none'),
    enabled: !!id,
    staleTime: Infinity,
    queryFn: ({ signal }) => apiRequest(`/matches/${id}`, { schema: MatchDetailSchema, signal }),
  });
