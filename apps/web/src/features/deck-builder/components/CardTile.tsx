import type { CardDef } from '@gwent/engine';
import { m } from 'motion/react';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';

type CardTileProps = {
  def: CardDef;
  /** Count shown in the corner ("x2"). */
  count: number;
  label: string;
  onClick: (() => void) | undefined;
};

/** Large collection/deck card, with the available count. */
export function CardTile({ def, count, label, onClick }: CardTileProps) {
  return (
    <m.button
      type="button"
      layout
      aria-label={label}
      title={label}
      disabled={!onClick}
      onClick={onClick}
      {...(onClick ? { whileHover: { scale: 1.04 } } : {})}
      className={cn(
        'relative aspect-[410/775] w-full bg-contain bg-center bg-no-repeat shadow-md',
        onClick ? 'cursor-pointer' : 'cursor-default opacity-50',
      )}
      style={{ backgroundImage: `url(${assets.cardLg(def.image)})` }}
    >
      <span className="absolute right-[4%] bottom-[22%] flex items-center gap-[0.2cqw] rounded-[0.2cqw] border border-gold/50 bg-ink/85 px-[0.3cqw] text-[0.9cqw] font-bold">
        <span
          aria-hidden
          className="size-[0.9cqw] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${assets.icon('preview_count')})` }}
        />
        x{count}
      </span>
    </m.button>
  );
}
