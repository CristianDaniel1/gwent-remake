import { PREMADE_DECKS, type DeckList } from '@gwent/engine';
import type { MatchResultKind } from '@gwent/shared';

/** Profile id used by the unit tests. */
export const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

/** Id of a second profile (the opponent, or the owner of someone else's data). */
export const OTHER_PROFILE_ID = '22222222-2222-4222-8222-222222222222';

/** Valid UUID that never exists in the database. */
export const MISSING_ID = '00000000-0000-4000-8000-000000000000';

/** Decks of the two seats in the test matches. */
export const TEST_DECKS = {
  p1: PREMADE_DECKS[0] as DeckList,
  p2: PREMADE_DECKS[4] as DeckList,
};

/** Deck under construction: allowed to be saved, but not playable. */
export const INCOMPLETE_DECK: DeckList = { faction: 'realms', leader: 22, cards: [[27, 1]] };

/** Deck with a card from another faction and too many copies: never accepted. */
export const IMPOSSIBLE_DECK: DeckList = {
  faction: 'realms',
  leader: 22,
  cards: [
    [61, 1],
    [1, 4],
  ],
};

/** Result for p1, by the winner the engine reports. */
export const P1_RESULT_BY_WINNER: Readonly<Record<'p1' | 'p2' | 'draw', MatchResultKind>> = {
  p1: 'win',
  p2: 'loss',
  draw: 'draw',
};
