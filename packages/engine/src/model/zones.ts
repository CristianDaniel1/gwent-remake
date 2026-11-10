import type { CombatRow } from './card';
import type { PlayerId } from './ids';

/** Where a card can be. Used in movement events and in the task stack. */
export type Zone =
  | { kind: 'deck'; player: PlayerId }
  | { kind: 'hand'; player: PlayerId }
  | { kind: 'grave'; player: PlayerId }
  | { kind: 'row'; side: PlayerId; row: CombatRow }
  | { kind: 'special'; side: PlayerId; row: CombatRow }
  | { kind: 'weather' }
  /** Out of play: created cards (tokens, transformations) or cards that ceased to exist. */
  | { kind: 'void' };

export type MoveReason =
  | 'draw'
  | 'redraw'
  | 'play'
  | 'muster'
  | 'revive'
  | 'summon'
  | 'transform'
  | 'destroy'
  | 'discard'
  | 'return'
  | 'steal'
  | 'roundEnd'
  | 'shuffle'
  | 'move';

export function sameZone(a: Zone, b: Zone): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
