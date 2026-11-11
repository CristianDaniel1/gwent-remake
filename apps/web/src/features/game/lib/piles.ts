import type { PlayerId, Zone } from '@gwent/engine';
import { LAYOUT } from '../data/layout';
import type { Rect } from '../interfaces/layout';

const screenSide = (player: PlayerId, human: PlayerId) => (player === human ? 'bottom' : 'top');

/**
 * Finds where a pile is drawn on the board.
 *
 * @param zone - Pile zone.
 * @param human - Human player.
 * @returns The pile rectangle, or null when it is not drawn.
 */
export const pileRect = (zone: Zone, human: PlayerId): Rect | null => {
  if (zone.kind === 'deck') return LAYOUT.deck[screenSide(zone.player, human)];
  if (zone.kind === 'grave') return LAYOUT.grave[screenSide(zone.player, human)];
  if (zone.kind === 'hand' && zone.player !== human) return LAYOUT.opponentHand;
  return null;
};
