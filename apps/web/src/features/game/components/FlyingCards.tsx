import type { PlayerId } from '@gwent/engine';
import { box } from '../lib/layout';
import { pileRect } from '../lib/piles';
import { useGameStore } from '../store/game.store';
import { BoardCard } from './BoardCard';

interface FlyingCardsProps {
  human: PlayerId;
}

export const FlyingCards = ({ human }: FlyingCardsProps) => {
  const flights = useGameStore((store) => store.flights);
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
};
