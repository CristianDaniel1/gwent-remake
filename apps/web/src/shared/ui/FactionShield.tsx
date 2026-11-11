import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';

interface FactionShieldProps {
  faction: string;
  className: string;
}

export const FactionShield = ({ faction, className }: FactionShieldProps) => (
  <span
    aria-hidden
    className={cn('shrink-0 bg-contain bg-center bg-no-repeat', className)}
    style={{ backgroundImage: `url(${assets.icon(`deck_shield_${faction}`)})` }}
  />
);
