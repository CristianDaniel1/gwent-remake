import {
  applyAction,
  chooseAiAction,
  createGame,
  PLAYER_IDS,
  randomFrom,
  type DeckList,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import { TEST_DECKS } from '../constants/test.constants';

/** A finished match played by the bot on both sides. */
export interface BotMatch {
  seed: number;
  decks: Record<PlayerId, DeckList>;
  actions: GameAction[];
  state: GameState;
  winner: PlayerId | 'draw';
}

/**
 * Plays a whole match with the bot on both sides, like a finished room or a client recording.
 *
 * @param seed - Match seed (also seeds the bot's choices).
 * @param decks - Decks of the two seats.
 * @returns The seed, decks, every action in order, the final state and the winner.
 */
export const playBotMatch = (seed: number, decks = TEST_DECKS): BotMatch => {
  let { state } = createGame({ seed, decks });
  const random = randomFrom({ state: seed });
  const actions: GameAction[] = [];
  while (state.phase !== 'gameOver') {
    const action = PLAYER_IDS.map((player) => chooseAiAction(state, player, random)).find(Boolean);
    if (!action) throw new Error('nobody can act');
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    actions.push(action);
  }
  if (!state.result) throw new Error('the match ended without a result');
  return { seed, decks, actions, state, winner: state.result };
};
