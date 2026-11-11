import type { CardDef } from '@gwent/engine';
import { m, type Transition } from 'motion/react';
import { memo, type MouseEventHandler, type ReactNode } from 'react';
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
  /** Drawn over the card (ability animations). */
  overlay?: ReactNode;
};

/** Golden wave while the card is picked: a ring spreading out and a light crossing the card, on a loop. */
function SelectWave() {
  return (
    <>
      <m.span
        aria-hidden
        initial={{ opacity: 0.9, scale: 1 }}
        animate={{ opacity: 0, scale: 1.35 }}
        transition={{ duration: 0.9, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.5 }}
        className="pointer-events-none absolute inset-0 z-20 rounded-[0.3cqw] border-[0.2cqw] border-gold shadow-[0_0_1cqw_#ffd864]"
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
        <m.span
          initial={{ x: '-120%' }}
          animate={{ x: '120%' }}
          transition={{ duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.5 }}
          className="absolute inset-y-0 -left-1/4 w-[150%] bg-[linear-gradient(110deg,transparent_30%,rgba(255,225,140,0.75)_50%,transparent_70%)]"
        />
      </span>
    </>
  );
}

/** Moving between zones (hand → row → grave…): a smooth flight. */
const LAYOUT_TRANSITION: Transition = { layout: { duration: 0.55, ease: [0.25, 0.8, 0.3, 1] } };

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
  overlay,
}: GameCardProps) {
  const shown = power ?? def.strength;
  // The large image already has strength, icons and name drawn on it; the small one gets the badges on top.
  const overlays = size === 'board';
  const powerBadge = overlays ? powerIcon(def) : null;
  const row = overlays ? rowIcon(def) : null;
  const ability = overlays ? abilityIcon(def) : null;
  const image = size === 'fill' ? assets.cardLg(def.image) : assets.cardSm(def.image);

  const shared = {
    ...(layoutId ? { layoutId, transition: LAYOUT_TRANSITION } : {}),
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
        'outline-gold z-10 -translate-y-[0.6cqw] shadow-[0_0_1.2cqw_rgba(255,216,100,0.8)] outline-[0.2cqw]',
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
      {selected && <SelectWave />}
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
      {overlay}
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
