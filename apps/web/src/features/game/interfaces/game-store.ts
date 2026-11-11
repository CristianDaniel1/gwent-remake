import type { CardInstanceId, GameEvent, GameAction, GameState, PlayerId } from '@gwent/engine';
import type { GameUpdate } from '@gwent/shared';
import type { MatchSetup } from './setup';
import type { Notice } from './notices';
import type { Match, OnlineMatch } from './match';
import type { Flight, MoveAnimations } from './animations';

export interface Spotlight {
  cardId: CardInstanceId;
  state: GameState;
}

export interface GameStore {
  match: Match | null;
  notices: Notice[];
  revealed: CardInstanceId[] | null;
  lastTurn: PlayerId | null;
  eventLog: { seq: number; events: GameEvent[]; notices: Notice[] } | null;
  spotlight: Spotlight | null;
  burning: readonly CardInstanceId[];
  flights: { cards: Flight[]; state: GameState } | null;
  animations: (MoveAnimations & { seq: number }) | null;
  settling: boolean;

  /**
   * Starts a match against the computer.
   *
   * @param setup - Seed, decks, difficulty and rules.
   */
  startMatch(setup: MatchSetup): void;
  /**
   * Applies a state update received from the server.
   *
   * @param update - New state and its events.
   * @param connection - Opponent name and the function that sends actions.
   */
  receiveOnline(update: GameUpdate, connection: Pick<OnlineMatch, 'opponentName' | 'send'>): void;
  /**
   * Plays an action.
   *
   * @param action - Action to play.
   * @returns False when the action is refused.
   */
  dispatch(action: GameAction): boolean;
  /** Removes the notice on screen. */
  dismissNotice(): void;
  /** Closes the revealed cards. */
  closeReveal(): void;
  /** Clears the match and everything shown for it. */
  leave(): void;
}
