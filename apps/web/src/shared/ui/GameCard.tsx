import type { CardDef } from '@gwent/engine';
import { m } from 'motion/react';
import { memo, type MouseEventHandler, type ReactNode } from 'react';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { CardBadges } from './CardBadges';
import { SelectWave } from './SelectWave';
import { CARD_LAYOUT_TRANSITION } from '../constants/motion';

export interface GameCardProps {
  def: CardDef;
  power?: number;
  size?: 'board' | 'fill';
  label: string;
  layoutId?: string;
  selected?: boolean;
  highlighted?: boolean;
  focused?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onHoverChange?: (hovering: boolean) => void;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  className?: string;
  lift?: boolean;
  overlay?: ReactNode;
}

const GameCardView = ({
  def,
  power,
  size = 'board',
  label,
  layoutId,
  selected,
  highlighted,
  focused,
  onClick,
  onHoverChange,
  onContextMenu,
  className,
  lift = true,
  overlay,
}: GameCardProps) => {
  const image = size === 'fill' ? assets.cardLg(def.image) : assets.cardSm(def.image);

  const shared = {
    ...(layoutId ? { layoutId, transition: CARD_LAYOUT_TRANSITION } : {}),
    'aria-label': label,
    title: label,
    onMouseEnter: () => onHoverChange?.(true),
    onMouseLeave: () => onHoverChange?.(false),
    ...(onContextMenu ? { onContextMenu } : {}),
    className: cn(
      'relative shrink-0 bg-contain bg-center bg-no-repeat shadow-[0_0_0.4cqw_rgba(0,0,0,0.6)]',
      size === 'board' ? 'h-[6.35cqw] w-[4.45cqw]' : 'h-full w-full',
      onClick ? 'cursor-pointer' : 'cursor-default',
      selected &&
        'z-10 -translate-y-[0.6cqw] shadow-[0_0_1.2cqw_rgba(255,216,100,0.8)] outline-[0.2cqw] outline-gold',
      highlighted && 'outline-[0.15cqw] outline-lime-300',
      focused && 'z-10 -translate-y-[0.4cqw] outline-[0.25cqw] outline-white',
      className,
    ),
    style: { backgroundImage: `url(${image})` },
    ...(highlighted ? { 'data-target': '' } : {}),
  };

  const content = (
    <>
      {selected && <SelectWave />}
      {size === 'board' && <CardBadges def={def} power={power ?? def.strength} />}
      {overlay}
    </>
  );

  if (!onClick)
    return (
      <m.div role="img" {...shared}>
        {content}
      </m.div>
    );

  return (
    <m.button
      type="button"
      onClick={onClick}
      {...(lift ? { whileHover: { y: '-6%' } } : {})}
      {...shared}
    >
      {content}
    </m.button>
  );
};

export const GameCard = memo(GameCardView);
