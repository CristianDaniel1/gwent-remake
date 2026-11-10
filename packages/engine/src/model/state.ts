import type { RngStreams } from '../core/rng';
import type { CardInstance, CombatRow, Faction } from './card';
import type { CardInstanceId, PlayerId } from './ids';
import type { PendingChoice, Task } from './tasks';

/** setup: before the cards are dealt (e.g. Scoia'tael choosing who starts). */
export type Phase = 'setup' | 'redraw' | 'playing' | 'gameOver';

export interface RowState {
  /** Units (and Decoy) in the row, in the order they entered. */
  units: CardInstanceId[];
  /** Special slot (Commander's Horn, Mardroeme). */
  special: CardInstanceId | null;
}

export type BoardSide = Record<CombatRow, RowState>;

export interface PlayerState {
  id: PlayerId;
  faction: Faction;
  leader: CardInstanceId;
  /** The leader's activatable ability has not been used yet. */
  leaderAvailable: boolean;
  /** Cancelled leader (Emhyr, the White Flame): no activation and no passive effects. */
  leaderDisabled: boolean;
  /** Weather only halves the strength of the units on this side (King Bran). */
  halfWeather: boolean;
  /** Top of the deck = index 0. */
  deck: CardInstanceId[];
  hand: CardInstanceId[];
  grave: CardInstanceId[];
  /** Rows on this player's side (may contain the opponent's spies). */
  rows: BoardSide;
  /** Remaining gems: one is lost per lost (or tied) round. */
  health: number;
  passed: boolean;
  redrawsLeft: number;
  redrawDone: boolean;
}

export interface GameFlags {
  /** Spies have doubled strength (Eredin, the Treacherous). */
  doubleSpyPower: boolean;
  /** Revive effects pick a random unit (Emhyr, the Invader). */
  randomRespawn: boolean;
  /** Faction abilities turned off (Scoia'tael versus Scoia'tael). */
  factionAbilitiesDisabled: boolean;
}

export interface RoundResult {
  round: number;
  winner: PlayerId | null;
  scores: Record<PlayerId, number>;
}

export type MatchResult = PlayerId | 'draw';

/** Id of a match-wide rule change (e.g. "fullHands"). */
export type MutatorId = string;

export interface GameState {
  readonly seed: number;
  phase: Phase;
  /** Every card in the match, indexed by instance id. */
  cards: Record<CardInstanceId, CardInstance>;
  players: Record<PlayerId, PlayerState>;
  /** Active weather cards (shared zone). */
  weather: CardInstanceId[];
  currentPlayer: PlayerId | null;
  /** Who started the current round (breaks ties for who starts the next one). */
  firstPlayer: PlayerId | null;
  round: number;
  roundHistory: RoundResult[];
  result: MatchResult | null;
  flags: GameFlags;
  /** Extra rules chosen for this match (see mechanics/mutators). */
  mutators: MutatorId[];
  /** Choice that blocks the resolution until the player answers (CHOOSE). */
  pendingChoice: PendingChoice | null;
  /** Tasks still to resolve; the top is the end of the array. */
  stack: Task[];
  rng: RngStreams;
  nextInstanceId: number;
}
