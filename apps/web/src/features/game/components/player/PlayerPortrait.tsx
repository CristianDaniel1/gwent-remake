import type { CSSProperties } from 'react';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';

interface PlayerPortraitProps {
  style: CSSProperties;
  active: boolean;
}

export const PlayerPortrait = ({ style, active }: PlayerPortraitProps) => (
  <div aria-hidden style={style}>
    <div
      className="absolute inset-[6%] rounded-full bg-[#2a2420] bg-cover bg-top bg-no-repeat"
      style={{ backgroundImage: `url(${assets.icon('profile')})` }}
    />
    <div
      className={cn(
        'absolute inset-0 bg-contain bg-center bg-no-repeat transition-[filter] duration-500',
        active && 'drop-shadow-[0_0_0.5cqw_#ffc85a]',
      )}
      style={{ backgroundImage: `url(${assets.icon('icon_player_border')})` }}
    />
  </div>
);
