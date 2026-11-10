import { COMBAT_ROWS } from '../model/card';
import type { GameEvent } from '../model/events';
import { PLAYER_IDS, type CardInstanceId, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import type { PendingChoice } from '../model/tasks';

/** An opponent's choice: the player knows it exists but does not see the options. */
function hideChoice(choice: PendingChoice): PendingChoice {
  return { ...choice, options: [], resume: { ...choice.resume, data: {} } };
}

/**
 * What a player (or a spectator, `viewer = null`) can see of the match (multiplayer).
 * - Hidden: the opponent's hand, the content and order of both decks, the opponent's
 *   choice options, the seed and the random generator state (with them the draws could be predicted).
 * - Visible: board, weather, graves, leaders, the player's own hand and the cards shown
 *   in the player's own choices (e.g. picking a card from the deck with Eredin).
 * A spectator sees no hand at all: otherwise they could pass hidden information to a player.
 * Hidden cards stay in the lists (so they can be counted), but without an entry in `cards`.
 */
export function projectFor(state: GameState, viewer: PlayerId | null): GameState {
  const visible = new Set<CardInstanceId>(state.weather);
  for (const player of PLAYER_IDS) {
    const p = state.players[player];
    visible.add(p.leader);
    p.grave.forEach((id) => visible.add(id));
    for (const row of COMBAT_ROWS) {
      p.rows[row].units.forEach((id) => visible.add(id));
      const special = p.rows[row].special;
      if (special) visible.add(special);
    }
  }
  if (viewer) state.players[viewer].hand.forEach((id) => visible.add(id));

  const choice = state.pendingChoice;
  if (choice?.player === viewer) {
    choice.options.forEach((o) => o.cardId && visible.add(o.cardId));
  }

  const cards = Object.fromEntries(
    Object.entries(state.cards).filter(([id]) => visible.has(id as CardInstanceId)),
  ) as GameState['cards'];

  return {
    ...state,
    seed: 0,
    cards,
    rng: {
      game: { state: 0 },
      deckHost: { state: 0 },
      deckGuest: { state: 0 },
      ai: { state: 0 },
    },
    pendingChoice: choice && choice.player !== viewer ? hideChoice(choice) : choice,
    // Pending tasks only exist on the server (and may reference hidden cards).
    stack: [],
  };
}

/** Events the player (or a spectator, `null`) can see: no cards revealed to someone else and no opponent options. */
export function projectEvents(events: readonly GameEvent[], viewer: PlayerId | null): GameEvent[] {
  return events.flatMap((event): GameEvent[] => {
    switch (event.type) {
      case 'CARDS_REVEALED':
        return event.player === viewer ? [event] : [];
      case 'CHOICE_REQUESTED':
        return [
          event.choice.player === viewer ? event : { ...event, choice: hideChoice(event.choice) },
        ];
      default:
        return [event];
    }
  });
}
