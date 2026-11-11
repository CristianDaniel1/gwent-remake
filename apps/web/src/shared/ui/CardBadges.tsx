import type { CardDef } from '@gwent/engine';
import { abilityIcon, powerIcon, rowIcon } from '@/shared/lib/card-visuals';
import { cn } from '@/shared/lib/cn';

interface CardBadgesProps {
  def: CardDef;
  power: number;
}

export const CardBadges = ({ def, power }: CardBadgesProps) => {
  const powerBadge = powerIcon(def);
  const ability = abilityIcon(def);
  const row = rowIcon(def);

  return (
    <>
      {powerBadge && (
        <span
          aria-hidden
          className="absolute top-[-4%] left-[-4%] h-1/2 w-[70%] bg-contain bg-top-left bg-no-repeat"
          style={{ backgroundImage: `url(${powerBadge})` }}
        >
          {def.type === 'unit' && (
            <span
              className={cn(
                'absolute top-[13%] left-[7%] w-1/2 text-center text-[1cqw] leading-none font-bold',
                def.hero ? 'text-white' : 'text-black',
                !def.hero && power > def.strength && 'text-green-800',
                !def.hero && power < def.strength && 'text-red-700',
              )}
            >
              {power}
            </span>
          )}
        </span>
      )}
      {ability && (
        <span
          aria-hidden
          className="absolute top-[75%] left-[31%] h-[22%] w-[33%] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${ability})` }}
        />
      )}
      {row && (
        <span
          aria-hidden
          className="absolute top-[75%] left-[65%] h-[22%] w-[33%] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${row})` }}
        />
      )}
    </>
  );
};
