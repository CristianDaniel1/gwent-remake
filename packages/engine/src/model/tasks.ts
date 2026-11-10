import type { AbilityId, CombatRow } from './card';
import type { CardInstanceId, PlayerId } from './ids';
import type { MoveReason, Zone } from './zones';

export type HookName = 'gameStart' | 'roundStart' | 'roundEnd' | 'turnEnd';

/** Free-form task/choice data. Must be JSON-serializable. */
export type TaskData = Record<string, unknown>;

/** Points to the mechanic that will continue a task or choice. */
export type MechanicRef =
  | { kind: 'ability'; id: AbilityId }
  | { kind: 'faction'; id: string }
  | { kind: 'mutator'; id: string }
  | { kind: 'core'; id: string };

/**
 * Pending resolution step. The task stack lives in the GameState: when an
 * effect asks for a choice, the resolution pauses and continues after the CHOOSE.
 */
export type Task =
  /** Expands into the individual hooks of each faction/leader. */
  | { type: 'HOOKS'; hook: HookName }
  | { type: 'HOOK'; hook: HookName; owner: PlayerId; source: MechanicRef }
  | { type: 'DEAL' }
  | { type: 'START_ROUND' }
  | { type: 'BEGIN_ROUND' }
  | { type: 'END_TURN' }
  | { type: 'END_ROUND' }
  | { type: 'FINISH_ROUND'; winner: PlayerId | null }
  | {
      type: 'PLACE';
      cardId: CardInstanceId;
      side: PlayerId;
      row: CombatRow;
      slot: 'units' | 'special';
      /** If the card is no longer here when the task runs, it is skipped. */
      from: Zone;
      reason: MoveReason;
      /** Abilities that do not trigger on this placement (e.g. muster does not summon again). */
      suppress?: AbilityId[];
    }
  | {
      type: 'TRIGGER';
      event: 'place' | 'leave';
      ability: AbilityId;
      cardId: CardInstanceId;
      side: PlayerId;
      row: CombatRow;
    }
  | { type: 'MECHANIC'; ref: MechanicRef; name: string; data: TaskData };

export interface ChoiceOption {
  /** Identifier sent in the CHOOSE. */
  id: string;
  cardId?: CardInstanceId;
  row?: CombatRow;
  player?: PlayerId;
}

/** Decision a player has to make for the resolution to continue. */
export interface PendingChoice {
  player: PlayerId;
  /** Kind of choice (so the UI can pick the text), e.g. "medic", "agileRow". */
  kind: string;
  options: ChoiceOption[];
  min: number;
  max: number;
  /** Card that originated the choice, if any. */
  sourceCardId?: CardInstanceId;
  resume: { ref: MechanicRef; name: string; data: TaskData };
}
