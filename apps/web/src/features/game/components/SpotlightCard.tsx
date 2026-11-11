import { m } from 'motion/react';
import { box, PREVIEW } from '../layout';
import { useGameStore } from '../store/game.store';
import { BoardCard } from './BoardCard';

/**
 * The card the opponent just played, enlarged: it comes from the opponent's side,
 * stays a moment and then flies to its place (same layoutId as the board card).
 */
export function SpotlightCard() {
  const spotlight = useGameStore((s) => s.spotlight);
  if (!spotlight) return null;
  return (
    <div data-testid="opponent-card" style={box(PREVIEW.card)} className="pointer-events-none z-40">
      <m.div
        initial={{ opacity: 0, x: '-120%', y: '-30%', scale: 0.35 }}
        animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.3, 1] }}
        className="relative h-full w-full"
      >
        <div
          aria-hidden
          className="absolute -inset-[6%] animate-turn-pulse rounded-[1cqw] bg-[radial-gradient(closest-side,rgba(255,200,100,0.45),transparent)] motion-reduce:animate-none"
        />
        <BoardCard state={spotlight.state} id={spotlight.cardId} size="fill" lift={false} />
      </m.div>
    </div>
  );
}
