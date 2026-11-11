import type { CardInstanceId } from '@gwent/engine';
import { useGameStore } from '../../store/game.store';
import { AbilityIcon } from './AbilityIcon';
import { BurnAnimation } from './BurnAnimation';
import { HeroFlames } from './HeroFlames';

interface CardAnimationProps {
  id: CardInstanceId;
}

export const CardAnimation = ({ id }: CardAnimationProps) => {
  const burning = useGameStore((store) => store.burning.includes(id));
  const anim = useGameStore((store) => store.animations?.cards[id]);
  const heroLanding = useGameStore((store) => store.animations?.heroes.includes(id) ?? false);
  const seq = useGameStore((store) => (anim || heroLanding ? store.animations?.seq : undefined));

  if (burning) return <BurnAnimation />;
  return (
    <>
      {heroLanding && <HeroFlames key={`hero-${seq}`} />}
      {anim && <AbilityIcon key={seq} anim={anim} />}
    </>
  );
};
