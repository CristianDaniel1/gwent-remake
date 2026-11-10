import type { CombatRow } from './card';
import type { CardInstanceId, PlayerId } from './ids';

/** Everything a player (human, bot or remote) can ask the engine for. */
export type GameAction =
  | { type: 'REDRAW'; player: PlayerId; cardId: CardInstanceId }
  | { type: 'END_REDRAW'; player: PlayerId }
  | {
      type: 'PLAY_CARD';
      player: PlayerId;
      cardId: CardInstanceId;
      /** Row (units, Horn, Mardroeme). */
      row?: CombatRow;
      /** Target card (Decoy). */
      targetId?: CardInstanceId;
    }
  | { type: 'ACTIVATE_LEADER'; player: PlayerId }
  | { type: 'PASS'; player: PlayerId }
  /** Answer to a pending choice: ids of the chosen options. */
  | { type: 'CHOOSE'; player: PlayerId; optionIds: string[] };

export type GameActionType = GameAction['type'];
