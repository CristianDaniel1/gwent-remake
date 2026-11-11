import type { CardDef } from '@gwent/engine';
import { Check } from 'lucide-react';
import { m } from 'motion/react';
import { cn } from '@/shared/lib/cn';
import { GameCard } from '@/shared/ui/GameCard';
import { CAROUSEL_TOP_CQW } from '../../constants/carousel';
import type { Slot } from '../../interfaces/carousel';
import { HIDDEN_SLOT, SLOTS, VISIBLE_DISTANCE } from '../../data/carousel';

const slotAt = (offset: number): Slot => {
  const slot = SLOTS[Math.abs(offset)] ?? HIDDEN_SLOT;
  return { ...slot, x: offset < 0 ? 100 - slot.x : slot.x };
};

interface CarouselSlideProps {
  def: CardDef;
  offset: number;
  label: string;
  marked: boolean;
  onClick: (() => void) | undefined;
}

export const CarouselSlide = ({ def, offset, label, marked, onClick }: CarouselSlideProps) => {
  const slot = slotAt(offset);
  const isCenter = offset === 0;
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.78 }}
      animate={{
        left: `${slot.x - slot.w / 2}cqw`,
        width: `${slot.w}cqw`,
        height: `${slot.h}cqw`,
        opacity: slot.opacity,
        scale: 1,
        filter: 'none',
      }}
      exit={{
        opacity: 0,
        y: '9cqw',
        scale: 0.5,
        rotate: -10,
        filter: 'grayscale(0.8) brightness(0.5)',
        transition: {
          duration: 0.6,
          ease: [0.55, -0.2, 0.6, 1],
          opacity: { duration: 0.35, delay: 0.3 },
        },
      }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ top: `${CAROUSEL_TOP_CQW}cqw` }}
      className={cn(
        'absolute rounded-[1.5cqw]',
        Math.abs(offset) === VISIBLE_DISTANCE && 'pointer-events-none',
        isCenter &&
          'z-10 shadow-[0_0_4cqw] shadow-gold outline-[0.3cqw] outline-gold hover:shadow-[0_0_2cqw]',
        !isCenter && 'hover:shadow-[0_0_1cqw] hover:shadow-gold',
      )}
    >
      <GameCard
        def={def}
        size="fill"
        lift={false}
        label={label}
        className="rounded-[1.5cqw]"
        {...(onClick ? { onClick } : {})}
      />
      {marked && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-[3%] right-[5%] flex size-[2.4cqw] items-center justify-center rounded-full border-[0.15cqw] border-gold bg-ink/90 text-gold-light"
        >
          <Check className="size-[70%]" />
        </span>
      )}
    </m.div>
  );
};
