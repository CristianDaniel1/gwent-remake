import type { PlayerId, Zone } from '@gwent/engine';
import { box, LAYOUT, type Rect } from '../layout';
import { useGameStore } from '../store/game.store';
import { BoardCard } from './BoardCard';

/** Where a pile is on the board, from the human's point of view. */
function pileRect(zone: Zone, human: PlayerId): Rect | null {
  const side = (player: PlayerId) => (player === human ? 'bottom' : 'top');
  if (zone.kind === 'deck') return LAYOUT.deck[side(zone.player)];
  if (zone.kind === 'grave') return LAYOUT.grave[side(zone.player)];
  if (zone.kind === 'hand' && zone.player !== human) return LAYOUT.opponentHand;
  return null;
}

/**
 * Cards drawn for a moment over a pile (deck, grave, opponent's hand). They share the
 * layoutId of the board card, so Motion flies them between the pile and the board.
 */
export function FlyingCards({ human }: { human: PlayerId }) {
  const flights = useGameStore((s) => s.flights);
  if (!flights) return null;
  return flights.cards.map(({ cardId, zone }) => {
    const rect = pileRect(zone, human);
    if (!rect) return null;
    return (
      <div
        key={cardId}
        aria-hidden
        data-flight
        style={box(rect)}
        className="pointer-events-none z-20 flex items-center justify-center"
      >
        <BoardCard state={flights.state} id={cardId} />
      </div>
    );
  });
}
