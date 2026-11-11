import { defOf, type CardInstanceId, type GameState } from '@gwent/engine';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, m, useIsPresent } from 'motion/react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { sfx } from '@/shared/audio/audio-manager';
import { useCardText } from '@/shared/i18n/useCardText';
import { useCarouselKeys } from '../hooks/useCarouselKeys';
import { useWheelStep } from '../hooks/useWheelStep';
import { AbilityList } from './AbilityList';
import { CarouselProgress } from './carousel/CarouselProgress';
import { CarouselSlide } from './carousel/CarouselSlide';
import { VISIBLE_DISTANCE } from '../data/carousel';

export interface CardCarouselProps {
  state: GameState;
  title: string;
  cardIds: readonly CardInstanceId[];
  startId?: CardInstanceId | undefined;
  onSelect?: ((id: CardInstanceId) => void) | undefined;
  selectLabel?: string | undefined;
  marked?: ReadonlySet<CardInstanceId> | undefined;
  onClose?: (() => void) | undefined;
  footer?: ReactNode;
  progress?: { used: number; total: number } | undefined;
}

export const CardCarousel = ({
  state,
  title,
  cardIds,
  startId,
  onSelect,
  selectLabel,
  marked,
  onClose,
  footer,
  progress,
}: CardCarouselProps) => {
  const { t: translate } = useTranslation();
  const cardText = useCardText();
  const titleId = useId();
  const isPresent = useIsPresent();
  const dialogRef = useRef<HTMLDivElement>(null);
  const ids = cardIds.filter((id) => state.cards[id]);
  const [index, setIndex] = useState(() => Math.max(0, startId ? ids.indexOf(startId) : 0));
  const current = Math.min(index, Math.max(0, ids.length - 1));
  const centerId = ids[current];

  const shift = (step: number) => {
    const next = Math.max(0, Math.min(ids.length - 1, current + step));
    if (next === current) return;
    setIndex(next);
    sfx.play('ui_card');
  };
  const select = () => {
    if (centerId && onSelect) onSelect(centerId);
  };
  useCarouselKeys(dialogRef, isPresent, { shift, select, onClose });
  const onWheel = useWheelStep(shift);

  const slideClick = (offset: number) => {
    if (offset) return () => shift(offset);
    return onSelect ? select : undefined;
  };

  const slideLabel = (id: CardInstanceId, isCenter: boolean) => {
    const name = cardText(defOf(state, id)).name;
    return isCenter && onSelect && selectLabel ? `${selectLabel}: ${name}` : name;
  };

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      inert={!isPresent}
      aria-hidden={!isPresent}
      onWheel={onWheel}
      className="absolute inset-0 z-50 bg-black/80"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-carousel
        className="absolute inset-0"
      >
        {progress && <CarouselProgress used={progress.used} total={progress.total} />}

        <h2
          id={titleId}
          className="absolute top-[12%] flex h-[7.5%] w-full items-center justify-center bg-ink/95 text-[1.75cqw] text-gold-light shadow-[0_0_1cqw_#ffffff54]"
        >
          {title}
        </h2>

        <AnimatePresence initial={false}>
          {ids.map((id, index) => {
            const offset = index - current;
            if (Math.abs(offset) > VISIBLE_DISTANCE) return null;
            const isCenter = offset === 0;
            return (
              <CarouselSlide
                key={id}
                def={defOf(state, id)}
                offset={offset}
                label={slideLabel(id, isCenter)}
                marked={marked?.has(id) ?? false}
                onClick={slideClick(offset)}
              />
            );
          })}
        </AnimatePresence>

        {centerId && (
          <AbilityList
            def={defOf(state, centerId)}
            className="absolute top-[77%] left-[35.35%] w-[29.12cqw]"
          />
        )}

        <button
          type="button"
          aria-label={translate('match.previous')}
          disabled={current <= 0}
          onClick={() => shift(-1)}
          className="carousel-arrow left-[2%]"
        >
          <ChevronLeft aria-hidden className="size-[70%]" />
        </button>
        <button
          type="button"
          aria-label={translate('match.next')}
          disabled={current >= ids.length - 1}
          onClick={() => shift(1)}
          className="carousel-arrow right-[2%]"
        >
          <ChevronRight aria-hidden className="size-[70%]" />
        </button>

        {onClose && (
          <button
            type="button"
            aria-label={translate('match.close')}
            title={translate('match.close')}
            onClick={onClose}
            className="absolute top-[13%] right-[2%] z-10 flex size-[3cqw] cursor-pointer items-center justify-center rounded-full border-[0.12cqw] border-gold bg-ink/60 text-gold hover:bg-gold/20"
          >
            <X aria-hidden className="size-[70%]" />
          </button>
        )}

        {footer && (
          <footer className="absolute top-[92%] left-1/2 flex -translate-x-1/2 gap-[0.8cqw]">
            {footer}
          </footer>
        )}
      </div>
    </m.div>
  );
};
