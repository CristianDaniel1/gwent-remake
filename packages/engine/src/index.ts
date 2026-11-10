// Public engine API. Other packages import only from here.

// Model
export type { GameAction, GameActionType } from './model/actions';
export {
  COMBAT_ROWS,
  FACTIONS,
  type AbilityId,
  type CardDef,
  type CardFaction,
  type CardInstance,
  type CardRow,
  type CardType,
  type CombatRow,
  type DeckList,
  type Faction,
} from './model/card';
export type { GameEvent, GameEventType } from './model/events';
export type { ChoiceOption, HookName, MechanicRef, PendingChoice, Task } from './model/tasks';
export type { MoveReason, Zone } from './model/zones';
export {
  cardDefId,
  opponentOf,
  PLAYER_IDS,
  type CardDefId,
  type CardInstanceId,
  type PlayerId,
} from './model/ids';
export type {
  BoardSide,
  GameFlags,
  GameState,
  MatchResult,
  MutatorId,
  Phase,
  PlayerState,
  RoundResult,
  RowState,
} from './model/state';

// Data
export { allCardDefs, findCardDef, getCardDef } from './data/catalog';
export { DeckListSchema } from './data/deck-schema';
export { PREMADE_DECKS, premadeDecksFor } from './data/premade';

// Rules
export { applyAction, type ActionErrorCode, type ActionResult } from './core/apply-action';
export {
  createGame,
  HAND_SIZE,
  MAX_REDRAWS,
  STARTING_HEALTH,
  type CreateGameOptions,
  type GameUpdate,
} from './core/create-game';
export {
  allowedInFaction,
  copiesInDeck,
  DECK_RULES,
  deckPool,
  deckStats,
  leadersOf,
  validateDeck,
  type DeckIssue,
  type DeckStats,
} from './core/deck-validation';
export { getLegalActions, isLegalAction } from './core/legal-actions';
export { playOptions, unitRows } from './core/play';
export {
  computeBoard,
  type BoardScore,
  type CardPower,
  type RowScore,
  type SideScore,
} from './core/scoring';
export { canPlay, canUseLeader } from './core/turn-flow';
export { naturalSide } from './core/board';
export { defOf, isRegularUnit, locate } from './core/zones';

// Multiplayer: what each player can see
export { projectEvents, projectFor } from './view/project';

// Bot
export { chooseAiAction, planAiAction } from './ai';
export {
  AI_DIFFICULTIES,
  chooseAiActionFor,
  determinize,
  type AiDifficulty,
  type SearchOptions,
} from './ai/difficulty';

// RNG
export {
  createRngStreams,
  deriveSeed,
  nextUint32,
  randomFrom,
  shuffled,
  type RandomSource,
  type RngCell,
  type RngStreamName,
  type RngStreams,
} from './core/rng';

// Mechanics extension
export {
  allMutatorIds,
  getMutator,
  registerAbility,
  registerFaction,
  registerMutator,
} from './mechanics/registry';
export { FULL_HANDS_EXTRA } from './mechanics/mutators';
export {
  POWER_STAGE,
  type AbilityDefinition,
  type EngineContext,
  type BoardPosition,
  type FactionDefinition,
  type Hook,
  type MutatorDefinition,
  type PlayOption,
  type PowerModifier,
  type RowModifier,
  type RowRef,
} from './mechanics/types';
