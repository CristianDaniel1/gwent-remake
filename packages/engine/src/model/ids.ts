declare const brand: unique symbol;

/** "Branded" type: prevents mixing up ids (e.g. a CardDefId with any number). */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Card definition id = position in the card catalog (cards.json). */
export type CardDefId = Brand<number, 'CardDefId'>;

/** Id of a card in play (each copy in the deck has its own). */
export type CardInstanceId = Brand<string, 'CardInstanceId'>;

export const PLAYER_IDS = ['p1', 'p2'] as const;
/** p1 = host (in single player, the local player); p2 = guest / bot. */
export type PlayerId = (typeof PLAYER_IDS)[number];

export const cardDefId = (n: number) => n as CardDefId;
export const cardInstanceId = (s: string) => s as CardInstanceId;
export const opponentOf = (player: PlayerId): PlayerId => (player === 'p1' ? 'p2' : 'p1');
