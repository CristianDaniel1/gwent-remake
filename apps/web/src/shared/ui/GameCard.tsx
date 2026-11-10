import type { CardDef } from '@gwent/engine';
import { m } from 'motion/react';
import { memo, type MouseEventHandler } from 'react';
import { assets } from '@/shared/lib/assets';
import { abilityIcon, powerIcon, rowIcon } from '@/shared/lib/card-visuals';
import { cn } from '@/shared/lib/cn';

export type GameCardProps = {
  def: CardDef;
  /** Current strength (on the board); without it, shows the printed strength. */
  power?: number;
  /** "board": board card size; "fill": fills the parent (large image). */
  size?: 'board' | 'fill';
  label: string;
  layoutId?: string;
  selected?: boolean;
  highlighted?: boolean;
  /** Focused with the keyboard. */
  focused?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onHoverChange?: (hovering: boolean) => void;
  /** Right-click (or long press): view the card in detail. */
  onContextMenu?: MouseEventHandler<HTMLElement>;
  className?: string;
  /** Lifts a little under the mouse (hand/board cards). Off in the carousel. */
  lift?: boolean;
};

/** Card with the strength, row and ability badges (at board size). A button when clickable. */
export const GameCard = memo(function GameCard({
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
}: GameCardProps) {
  const shown = power ?? def.strength;
  // The large image already has strength, icons and name drawn on it; the small one gets the badges on top.
  const overlays = size === 'board';
  const powerBadge = overlays ? powerIcon(def) : null;
  const row = overlays ? rowIcon(def) : null;
  const ability = overlays ? abilityIcon(def) : null;
  const image = size === 'fill' ? assets.cardLg(def.image) : assets.cardSm(def.image);

  const shared = {
    ...(layoutId ? { layoutId } : {}),
    'aria-label': label,
    title: label,
    onMouseEnter: () => onHoverChange?.(true),
    onMouseLeave: () => onHoverChange?.(false),
    ...(onContextMenu ? { onContextMenu } : {}),
    className: cn(
      'relative shrink-0 bg-contain bg-center bg-no-repeat shadow-[0_0_0.4cqw_rgba(0,0,0,0.6)]',
      size === 'board' ? 'h-[6.35cqw] w-[4.45cqw]' : 'h-full w-full',
      onClick ? 'cursor-pointer' : 'cursor-default',
      selected && 'outline-gold z-10 -translate-y-[0.6cqw] outline-[0.2cqw]',
      highlighted && 'outline-[0.15cqw] outline-lime-300',
      focused && 'z-10 -translate-y-[0.4cqw] outline-[0.25cqw] outline-white',
      className,
    ),
    style: { backgroundImage: `url(${image})` },
    // Play target (Decoy): marked for tests and styles
    ...(highlighted ? { 'data-target': '' } : {}),
  };

  const content = (
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
                'absolute top-[13%] left-[7%] w-1/2 text-center leading-none font-bold',
                'text-[1cqw]',
                def.hero ? 'text-white' : 'text-black',
                !def.hero && shown > def.strength && 'text-green-800',
                !def.hero && shown < def.strength && 'text-red-700',
              )}
            >
              {shown}
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

  return onClick ? (
    <m.button
      type="button"
      onClick={onClick}
      {...(lift ? { whileHover: { y: '-6%' } } : {})}
      {...shared}
    >
      {content}
    </m.button>
  ) : (
    // View-only card: it is an image (the label says which one)
    <m.div role="img" {...shared}>
      {content}
    </m.div>
  );
});
