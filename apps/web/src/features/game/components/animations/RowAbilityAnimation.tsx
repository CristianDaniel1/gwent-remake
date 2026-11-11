import type { CombatRow, PlayerId } from '@gwent/engine';
import { useGameStore } from '../../store/game.store';
import { HornRowAnimation } from './HornRowAnimation';

interface RowAbilityAnimationProps {
  side: PlayerId;
  row: CombatRow;
}

export const RowAbilityAnimation = ({ side, row }: RowAbilityAnimationProps) => {
  const seq = useGameStore((store) =>
    store.animations?.rows.some(
      (rowAnimation) => rowAnimation.side === side && rowAnimation.row === row,
    )
      ? store.animations.seq
      : null,
  );
  return seq ? <HornRowAnimation key={seq} /> : null;
};
