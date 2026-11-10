import type { AbilityId, CombatRow, Faction } from './card';
import type { CardInstanceId, PlayerId } from './ids';
import type { MatchResult } from './state';
import type { PendingChoice } from './tasks';
import type { MoveReason, Zone } from './zones';

/**
 * What happened in the match, in order. Describes facts, never "how to show them":
 * the UI decides animations and sounds from here.
 */
export type GameEvent =
  | { type: 'COIN_TOSSED'; firstPlayer: PlayerId }
  | { type: 'FIRST_PLAYER_CHOSEN'; chooser: PlayerId; firstPlayer: PlayerId }
  /** Every card movement: draw, play, death, return to hand… */
  | { type: 'CARD_MOVED'; cardId: CardInstanceId; from: Zone; to: Zone; reason: MoveReason }
  | { type: 'CARD_REDRAWN'; player: PlayerId; returned: CardInstanceId; drawn: CardInstanceId }
  | { type: 'REDRAW_ENDED'; player: PlayerId }
  | { type: 'ROUND_STARTED'; round: number; currentPlayer: PlayerId }
  | { type: 'TURN_STARTED'; player: PlayerId }
  /** Player intent (the UI shows the card before the effects). */
  | {
      type: 'CARD_PLAYED';
      player: PlayerId;
      cardId: CardInstanceId;
      row?: CombatRow;
      targetId?: CardInstanceId;
    }
  | { type: 'LEADER_ACTIVATED'; player: PlayerId; cardId: CardInstanceId }
  /** A card ability triggered (lets the UI play a sound/animation). */
  | { type: 'ABILITY_TRIGGERED'; ability: AbilityId; player: PlayerId; cardId?: CardInstanceId }
  | { type: 'FACTION_ABILITY'; faction: Faction; player: PlayerId }
  /** A match rule (mutator) did something for `player`, e.g. boosted `cardId`. */
  | { type: 'MUTATOR_TRIGGERED'; mutator: string; player: PlayerId; cardId?: CardInstanceId }
  | { type: 'CHOICE_REQUESTED'; choice: PendingChoice }
  /** Cards shown only to `player` (Emhyr, the Emperor). */
  | { type: 'CARDS_REVEALED'; player: PlayerId; cardIds: CardInstanceId[] }
  | { type: 'PLAYER_PASSED'; player: PlayerId; automatic: boolean }
  | {
      type: 'ROUND_ENDED';
      round: number;
      winner: PlayerId | null;
      scores: Record<PlayerId, number>;
    }
  | { type: 'GAME_ENDED'; result: MatchResult };

export type GameEventType = GameEvent['type'];
