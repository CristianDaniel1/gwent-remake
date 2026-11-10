import type { RandomSource, RngStreamName } from '../core/rng';
import type { AbilityId, CardDef, CardInstance, CombatRow, Faction } from '../model/card';
import type { GameEvent } from '../model/events';
import type { CardInstanceId, PlayerId } from '../model/ids';
import type { GameState, RowState } from '../model/state';
import type { HookName, PendingChoice, Task, TaskData } from '../model/tasks';

export type { HookName };

/**
 * What a mechanic receives to act. `state` is an Immer draft:
 * it can be changed directly, and the engine produces the new immutable state at the end.
 */
export interface EngineContext {
  readonly state: GameState;
  emit(event: GameEvent): void;
  random(stream: RngStreamName): RandomSource;
  /**
   * Schedules tasks. Tasks scheduled during the same step run in the order they
   * were scheduled, before whatever was already on the stack.
   */
  schedule(...tasks: Task[]): void;
  /** Pauses the resolution until the player answers with CHOOSE. */
  requestChoice(choice: PendingChoice): void;
}

/** `owner` is the player who owns the faction/leader/card that registered the hook. */
export type Hook = (ctx: EngineContext, owner: PlayerId) => void;

export type TaskHandler = (ctx: EngineContext, data: TaskData) => void;
export type ChoiceHandler = (ctx: EngineContext, chosen: string[], data: TaskData) => void;

/** Order in which strength modifiers are applied. */
export const POWER_STAGE = {
  /** Weather: strength becomes 1. */
  weather: 100,
  /** Spies with doubled strength (leader). */
  spy: 200,
  /** Tight Bond: multiplies by the number of copies. */
  bond: 300,
  /** Morale: adds. */
  morale: 400,
  /** Horn: doubles (only once). */
  horn: 500,
} as const;

export interface PowerModifier {
  stage: number;
  /**
   * Modifiers with the same key do not stack on a card
   * (e.g. two horns on the same row double only once).
   */
  key?: string;
  appliesTo?(target: CardInstance, def: CardDef): boolean;
  apply(power: number, target: CardInstance, def: CardDef): number;
}

export interface RowRef {
  side: PlayerId;
  row: CombatRow;
}

export interface RowModifier extends RowRef {
  modifier: PowerModifier;
}

/** Where the card is when a placement/leave effect triggers. */
export interface BoardPosition extends RowRef {
  cardId: CardInstanceId;
}

/** How to play a non-unit card from the hand. */
export interface PlayOption {
  row?: CombatRow;
  targetId?: CardInstanceId;
}

export interface SpecialPlay {
  /** Valid options now (empty = it cannot be played). */
  options(state: GameState, player: PlayerId, cardId: CardInstanceId): PlayOption[];
  /** Resolves the play. The card is still in the hand when this is called. */
  resolve(ctx: EngineContext, player: PlayerId, cardId: CardInstanceId, option: PlayOption): void;
}

export interface AbilityDefinition {
  id: AbilityId;
  /** The card is played on the opponent's side (spy). */
  playsOnOpponentSide?: boolean;
  /** For special and weather cards: how they are played from the hand. */
  play?: SpecialPlay;
  /**
   * Modifiers the card applies to the units of one or more rows while it is
   * on the board (row or weather zone).
   */
  modifiers?(source: CardInstance, location: RowRef | 'weather', state: GameState): RowModifier[];
  /** When entering a row. */
  onPlace?(ctx: EngineContext, position: BoardPosition): void;
  /** When leaving a row (death, Decoy, round end…). */
  onLeave?(ctx: EngineContext, position: BoardPosition): void;
  /** Match hooks: used by passive leader effects. */
  hooks?: Partial<Record<HookName, Hook>>;
  /** Activatable leader ability (once per match). */
  onActivate?(ctx: EngineContext, owner: PlayerId): void;
  /** Whether the leader can be activated now (default: yes). */
  canActivate?(state: GameState, owner: PlayerId): boolean;
  /** How much the bot wants to activate this leader now (optional; leaders without it use the built-in bot weights). */
  aiWeight?(state: GameState, owner: PlayerId): number;
  /** Named continuations, used by MECHANIC tasks scheduled by the mechanic. */
  tasks?: Record<string, TaskHandler>;
  /** Continuations after a player choice. */
  choices?: Record<string, ChoiceHandler>;
}

export interface FactionDefinition {
  id: Faction;
  /** Wins tied rounds (Nilfgaard), except against another faction with the same rule. */
  winsTies?: boolean;
  hooks?: Partial<Record<HookName, Hook>>;
  tasks?: Record<string, TaskHandler>;
  choices?: Record<string, ChoiceHandler>;
}

/**
 * A match-wide rule change, chosen before the match (e.g. "no leaders"). It can change the
 * starting state and react to match hooks; hooks run once for each player (`owner`).
 */
export interface MutatorDefinition {
  id: string;
  /** Changes the starting state (an Immer draft), before anything is dealt. */
  setup?(state: GameState): void;
  hooks?: Partial<Record<HookName, Hook>>;
  tasks?: Record<string, TaskHandler>;
  choices?: Record<string, ChoiceHandler>;
}

/** Engine mechanics that also use tasks/choices (e.g. choosing an agile row). */
export interface CoreMechanic {
  id: string;
  tasks?: Record<string, TaskHandler>;
  choices?: Record<string, ChoiceHandler>;
}

export type { RowState };
