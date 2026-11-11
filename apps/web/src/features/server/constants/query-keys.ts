/** Query keys of the server data. */
export const SERVER_QUERY_KEYS = {
  health: ['server', 'health'] as const,
  decks: (profileId: string) => ['server', 'decks', profileId] as const,
  matches: (profileId: string) => ['server', 'matches', profileId] as const,
  match: (id: string) => ['server', 'match', id] as const,
};
